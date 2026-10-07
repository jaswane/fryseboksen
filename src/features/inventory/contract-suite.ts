import { expect, it } from "vitest";
import type { InventoryAdapter, InventoryCommandInput } from "./adapter";
import { itemKey, selectItems, type Entry, type InventorySnapshot } from "./domain";

export interface ContractContext {
  adapter: InventoryAdapter;
  /** A freezer that starts empty and belongs to the caller. */
  freezerId: string;
  /** A second freezer with the same owner, used for isolation checks. */
  otherFreezerId: string;
  /** The date the adapter treats as today in Europe/Oslo. */
  today: string;
}
export interface ContractHarness {
  create(): Promise<ContractContext>;
  dispose?(context: ContractContext): Promise<void>;
}

export function shiftDate(date: string, days: number): string {
  const value = new Date(date + "T12:00:00Z");
  value.setUTCDate(value.getUTCDate() + days);
  return value.toISOString().slice(0, 10);
}

/**
 * The product rules from docs/product-decisions.md, written without any storage
 * detail. Every adapter passes this identically, which is what makes replacing
 * the local demo with Supabase a change of composition root rather than of UI.
 */
export function describeInventoryContract(harness: ContractHarness): void {
  const withContext = async (body: (context: ContractContext) => Promise<void>) => {
    const context = await harness.create();
    try {
      await body(context);
    } finally {
      await harness.dispose?.(context);
    }
  };
  const run = (adapter: InventoryAdapter, command: InventoryCommandInput) =>
    adapter.execute({ ...command, requestId: crypto.randomUUID() });
  const find = (snapshot: InventorySnapshot, id: string): Entry | undefined =>
    snapshot.entries.find((entry) => entry.id === id);

  /** Two beef packages from long ago, one from three days ago, plus two other items. */
  async function seed(context: ContractContext) {
    const { adapter, freezerId, today } = context;
    const old = shiftDate(today, -250);
    const recent = shiftDate(today, -3);
    for (const command of [
      { name: "Kjøttdeig", quantity: 2, unit: "pakker" as const, frozenOn: old },
      { name: "Kjøttdeig", quantity: 1, unit: "pakker" as const, frozenOn: recent },
      { name: "Laks", quantity: 2, unit: "pakker" as const, frozenOn: shiftDate(today, -120) },
      { name: "Lasagne", quantity: 2, unit: "porsjoner" as const, frozenOn: shiftDate(today, -24) },
    ])
      await run(adapter, { type: "add", freezerId, ...command });
    const snapshot = await adapter.getInventory(freezerId);
    const beef = snapshot.entries
      .filter((entry) => entry.name === "Kjøttdeig")
      .sort((a, b) => a.frozenOn.localeCompare(b.frozenOn));
    return { snapshot, old, recent, beefKey: itemKey(beef[0]), oldest: beef[0], newer: beef[1] };
  }

  it("collects one row per name and unit while every freezing date is kept", () =>
    withContext(async (context) => {
      const { snapshot, old, beefKey } = await seed(context);
      const items = selectItems(snapshot.entries);
      expect(items).toHaveLength(3);
      const beef = items.find((item) => item.key === beefKey)!;
      expect(beef.quantity).toBe(3);
      expect(beef.oldestDate).toBe(old);
      expect(beef.entries).toHaveLength(2);
    }));

  it("normalizes the name but never merges different units", () =>
    withContext(async ({ adapter, freezerId, today }) => {
      await run(adapter, {
        type: "add",
        freezerId,
        name: "  KJØTTDEIG  ",
        quantity: 2,
        unit: "pakker",
        frozenOn: today,
      });
      const result = await run(adapter, {
        type: "add",
        freezerId,
        name: "Kjøttdeig",
        quantity: 1,
        unit: "porsjoner",
        frozenOn: today,
      });
      const items = selectItems(result.snapshot.entries, "kjøtt");
      expect(items).toHaveLength(2);
      expect(items.find((item) => item.unit === "pakker")?.quantity).toBe(2);
      expect(items.find((item) => item.unit === "porsjoner")?.quantity).toBe(1);
    }));

  it("minus takes from the oldest entry and moves on when it is used up", () =>
    withContext(async (context) => {
      const { adapter, freezerId } = context;
      const { beefKey, oldest, newer } = await seed(context);
      const first = await run(adapter, { type: "take-one", freezerId, itemKey: beefKey });
      expect(find(first.snapshot, oldest.id)?.quantity).toBe(1);
      expect(find(first.snapshot, newer.id)?.quantity).toBe(1);
      const second = await run(adapter, { type: "take-one", freezerId, itemKey: beefKey });
      expect(find(second.snapshot, oldest.id)).toBeUndefined();
      expect(find(second.snapshot, newer.id)?.quantity).toBe(1);
      const third = await run(adapter, { type: "take-one", freezerId, itemKey: beefKey });
      expect(selectItems(third.snapshot.entries).some((item) => item.key === beefKey)).toBe(false);
    }));

  it("undoing minus restores the exact quantity, id and date", () =>
    withContext(async (context) => {
      const { adapter, freezerId } = context;
      const { beefKey, oldest } = await seed(context);
      const taken = await run(adapter, { type: "take-one", freezerId, itemKey: beefKey });
      const undone = await adapter.undo(taken.undo!);
      expect(find(undone.snapshot, oldest.id)).toMatchObject({
        quantity: 2,
        frozenOn: oldest.frozenOn,
        createdAt: oldest.createdAt,
      });
    }));

  it("undoing minus on the last unit brings the entry back unchanged", () =>
    withContext(async ({ adapter, freezerId, today }) => {
      await run(adapter, {
        type: "add",
        freezerId,
        name: "Brød",
        quantity: 1,
        unit: "stk",
        frozenOn: shiftDate(today, -8),
      });
      const bread = (await adapter.getInventory(freezerId)).entries[0];
      const taken = await run(adapter, { type: "take-one", freezerId, itemKey: itemKey(bread) });
      expect(taken.snapshot.entries).toHaveLength(0);
      const undone = await adapter.undo(taken.undo!);
      expect(undone.snapshot.entries).toHaveLength(1);
      expect(undone.snapshot.entries[0]).toMatchObject({
        id: bread.id,
        quantity: 1,
        frozenOn: bread.frozenOn,
        createdAt: bread.createdAt,
      });
    }));

  it("plus always adds a new entry dated today, even when one exists from today", () =>
    withContext(async (context) => {
      const { adapter, freezerId, today } = context;
      const { beefKey } = await seed(context);
      await run(adapter, { type: "add-one", freezerId, itemKey: beefKey });
      const result = await run(adapter, { type: "add-one", freezerId, itemKey: beefKey });
      const fromToday = result.snapshot.entries.filter(
        (entry) => entry.name === "Kjøttdeig" && entry.frozenOn === today,
      );
      expect(fromToday).toHaveLength(2);
      expect(fromToday.every((entry) => entry.quantity === 1)).toBe(true);
      const undone = await adapter.undo(result.undo!);
      expect(
        undone.snapshot.entries.filter(
          (entry) => entry.name === "Kjøttdeig" && entry.frozenOn === today,
        ),
      ).toHaveLength(1);
    }));

  it("edit corrects an entry without inventing a new addition", () =>
    withContext(async (context) => {
      const { adapter, freezerId, today } = context;
      const { beefKey, oldest, newer } = await seed(context);
      const before = selectItems((await adapter.getInventory(freezerId)).entries, "", "newest");
      const corrected = shiftDate(today, -200);
      const result = await run(adapter, {
        type: "edit",
        freezerId,
        itemKey: beefKey,
        name: "Kjøttdeig",
        unit: "pakker",
        entries: [
          { id: oldest.id, quantity: 4, frozenOn: corrected, expectedVersion: oldest.version },
          {
            id: newer.id,
            quantity: newer.quantity,
            frozenOn: newer.frozenOn,
            expectedVersion: newer.version,
          },
        ],
      });
      const edited = find(result.snapshot, oldest.id)!;
      expect(edited.quantity).toBe(4);
      expect(edited.frozenOn).toBe(corrected);
      expect(edited.createdAt).toBe(oldest.createdAt);
      expect(edited.updatedAt >= oldest.updatedAt).toBe(true);
      expect(edited.version).toBeGreaterThan(oldest.version);
      const after = selectItems(result.snapshot.entries, "", "newest");
      expect(after.map((item) => item.name)).toEqual(before.map((item) => item.name));
    }));

  it("zero in edit removes one mistaken entry and leaves the other dates alone", () =>
    withContext(async (context) => {
      const { adapter, freezerId } = context;
      const { beefKey, oldest, newer } = await seed(context);
      const result = await run(adapter, {
        type: "edit",
        freezerId,
        itemKey: beefKey,
        name: "Kjøttdeig",
        unit: "pakker",
        entries: [
          {
            id: oldest.id,
            quantity: 0,
            frozenOn: oldest.frozenOn,
            expectedVersion: oldest.version,
          },
          {
            id: newer.id,
            quantity: newer.quantity,
            frozenOn: newer.frozenOn,
            expectedVersion: newer.version,
          },
        ],
      });
      expect(find(result.snapshot, oldest.id)).toBeUndefined();
      expect(find(result.snapshot, newer.id)?.quantity).toBe(1);
      const undone = await adapter.undo(result.undo!);
      expect(find(undone.snapshot, oldest.id)).toMatchObject({
        quantity: 2,
        frozenOn: oldest.frozenOn,
      });
    }));

  it("rejects an edit built on a stale view of the item", () =>
    withContext(async (context) => {
      const { adapter, freezerId } = context;
      const { beefKey, oldest, newer } = await seed(context);
      await run(adapter, { type: "take-one", freezerId, itemKey: beefKey });
      await expect(
        run(adapter, {
          type: "edit",
          freezerId,
          itemKey: beefKey,
          name: "Kjøttdeig",
          unit: "pakker",
          entries: [
            {
              id: oldest.id,
              quantity: oldest.quantity,
              frozenOn: oldest.frozenOn,
              expectedVersion: oldest.version,
            },
            {
              id: newer.id,
              quantity: newer.quantity,
              frozenOn: newer.frozenOn,
              expectedVersion: newer.version,
            },
          ],
        }),
      ).rejects.toThrow("endret siden");
    }));

  it("delete and undo keep every date and quantity", () =>
    withContext(async (context) => {
      const { adapter, freezerId } = context;
      const { beefKey, oldest, newer } = await seed(context);
      const deleted = await run(adapter, { type: "delete", freezerId, itemKey: beefKey });
      expect(deleted.snapshot.entries.some((entry) => entry.name === "Kjøttdeig")).toBe(false);
      const undone = await adapter.undo(deleted.undo!);
      expect(find(undone.snapshot, oldest.id)).toMatchObject({
        quantity: 2,
        frozenOn: oldest.frozenOn,
        createdAt: oldest.createdAt,
      });
      expect(find(undone.snapshot, newer.id)).toMatchObject({
        quantity: 1,
        frozenOn: newer.frozenOn,
      });
    }));

  it("undo leaves unrelated later additions in place", () =>
    withContext(async (context) => {
      const { adapter, freezerId, today } = context;
      const { beefKey, oldest } = await seed(context);
      const taken = await run(adapter, { type: "take-one", freezerId, itemKey: beefKey });
      await run(adapter, {
        type: "add",
        freezerId,
        name: "Erter",
        quantity: 1,
        unit: "pakker",
        frozenOn: today,
      });
      const undone = await adapter.undo(taken.undo!);
      expect(undone.snapshot.entries.some((entry) => entry.name === "Erter")).toBe(true);
      expect(find(undone.snapshot, oldest.id)?.quantity).toBe(2);
    }));

  it("refuses an undo that would overwrite a newer change to the same entry", () =>
    withContext(async (context) => {
      const { adapter, freezerId } = context;
      const { beefKey } = await seed(context);
      const first = await run(adapter, { type: "take-one", freezerId, itemKey: beefKey });
      await run(adapter, { type: "take-one", freezerId, itemKey: beefKey });
      await expect(adapter.undo(first.undo!)).rejects.toThrow("nyere endring");
    }));

  it("renames the freezer and undoes it without touching the contents", () =>
    withContext(async (context) => {
      const { adapter, freezerId } = context;
      const { snapshot } = await seed(context);
      const renamed = await run(adapter, {
        type: "rename-freezer",
        freezerId,
        name: "  Fryseren i boden ",
      });
      expect(renamed.snapshot.freezer.name).toBe("Fryseren i boden");
      expect(renamed.snapshot.entries).toEqual(snapshot.entries);
      const undone = await adapter.undo(renamed.undo!);
      expect(undone.snapshot.freezer.name).toBe(snapshot.freezer.name);
      expect(undone.snapshot.entries).toEqual(snapshot.entries);
    }));

  it("keeps the two freezers apart", () =>
    withContext(async ({ adapter, freezerId, otherFreezerId, today }) => {
      await run(adapter, {
        type: "add",
        freezerId,
        name: "Suppe",
        quantity: 2,
        unit: "porsjoner",
        frozenOn: today,
      });
      expect((await adapter.getInventory(otherFreezerId)).entries).toHaveLength(0);
      expect((await adapter.getInventory(freezerId)).entries).toHaveLength(1);
    }));

  it("repeats the answer but not the effect for a repeated request id", () =>
    withContext(async (context) => {
      const { adapter, freezerId } = context;
      const { beefKey } = await seed(context);
      const requestId = crypto.randomUUID();
      const command = { type: "add-one" as const, freezerId, itemKey: beefKey, requestId };
      const first = await adapter.execute(command);
      const again = await adapter.execute(command);
      expect(again.message).toBe(first.message);
      expect(again.snapshot.entries).toEqual(first.snapshot.entries);
      const now = await adapter.getInventory(freezerId);
      expect(now.entries.filter((entry) => entry.name === "Kjøttdeig")).toHaveLength(3);
    }));

  it("repeats the answer but not the effect for a repeated undo", () =>
    withContext(async (context) => {
      const { adapter, freezerId } = context;
      const { beefKey, oldest } = await seed(context);
      const taken = await run(adapter, { type: "take-one", freezerId, itemKey: beefKey });
      const first = await adapter.undo(taken.undo!);
      const again = await adapter.undo(taken.undo!);
      expect(again.message).toBe(first.message);
      expect(find(again.snapshot, oldest.id)?.quantity).toBe(2);
      expect(find(await adapter.getInventory(freezerId), oldest.id)?.quantity).toBe(2);
    }));

  it("reports an unknown undo receipt instead of guessing", () =>
    withContext(async ({ adapter }) => {
      await expect(adapter.undo({ id: crypto.randomUUID(), label: "" })).rejects.toThrow(
        "kan ikke angres",
      );
    }));

  it("reports an item that no longer exists", () =>
    withContext(async (context) => {
      const { adapter, freezerId } = context;
      const { beefKey } = await seed(context);
      await run(adapter, { type: "delete", freezerId, itemKey: beefKey });
      await expect(run(adapter, { type: "take-one", freezerId, itemKey: beefKey })).rejects.toThrow(
        "finnes ikke lenger",
      );
    }));

  it.each([0, -1, 1000])("refuses the quantity %s", (quantity) =>
    withContext(async ({ adapter, freezerId, today }) => {
      await expect(
        run(adapter, {
          type: "add",
          freezerId,
          name: "Erter",
          quantity,
          unit: "stk",
          frozenOn: today,
        }),
      ).rejects.toThrow("Antall");
    }),
  );

  it("refuses a freezing date in the future", () =>
    withContext(async ({ adapter, freezerId, today }) => {
      await expect(
        run(adapter, {
          type: "add",
          freezerId,
          name: "Erter",
          quantity: 1,
          unit: "stk",
          frozenOn: shiftDate(today, 1),
        }),
      ).rejects.toThrow("dato");
    }));

  it("refuses an empty name", () =>
    withContext(async ({ adapter, freezerId, today }) => {
      await expect(
        run(adapter, {
          type: "add",
          freezerId,
          name: "   ",
          quantity: 1,
          unit: "stk",
          frozenOn: today,
        }),
      ).rejects.toThrow("varenavn");
    }));

  it("never goes negative when the same item is taken repeatedly at once", () =>
    withContext(async (context) => {
      const { adapter, freezerId } = context;
      const { beefKey } = await seed(context);
      const attempts = await Promise.allSettled(
        Array.from({ length: 5 }, () =>
          run(adapter, { type: "take-one", freezerId, itemKey: beefKey }),
        ),
      );
      expect(attempts.filter((attempt) => attempt.status === "fulfilled")).toHaveLength(3);
      const remaining = await adapter.getInventory(freezerId);
      expect(remaining.entries.some((entry) => entry.name === "Kjøttdeig")).toBe(false);
      expect(remaining.entries.every((entry) => entry.quantity > 0)).toBe(true);
      expect(remaining.entries.some((entry) => entry.name === "Laks")).toBe(true);
    }));
}
