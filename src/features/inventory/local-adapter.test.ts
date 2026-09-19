import { beforeEach, describe, expect, it } from "vitest";
import { LocalInventoryAdapter, type DemoStorage } from "./local-adapter";
import { createDemoState, DEMO_FREEZER_ID, EMPTY_FREEZER_ID } from "./demo-seed";
import { groupEntries, itemKey, osloToday, selectItems, type Entry } from "./domain";

const now = new Date("2026-09-19T10:00:00.000Z");
function memoryStorage(): DemoStorage {
  let value: string | null = null;
  return {
    read: () => value,
    write: (next) => {
      value = next;
    },
  };
}
describe("inventory adapter contract", () => {
  let adapter: LocalInventoryAdapter;
  let storage: DemoStorage;
  let beefKey: string;
  beforeEach(() => {
    storage = memoryStorage();
    adapter = new LocalInventoryAdapter(storage, () => now);
    beefKey = itemKey(createDemoState(now).entries[0]);
  });
  const correction = (entry: Entry, quantity = entry.quantity, frozenOn = entry.frozenOn) => ({
    id: entry.id,
    expectedVersion: entry.version,
    quantity,
    frozenOn,
  });
  it("groups 2 January packages and one recent package into a single row", async () => {
    const { entries } = await adapter.getInventory(DEMO_FREEZER_ID);
    const items = groupEntries(entries);
    expect(items).toHaveLength(5);
    const beef = items.find((item) => item.key === beefKey)!;
    expect(beef.quantity).toBe(3);
    expect(beef.oldestDate).toBe("2026-01-12");
    expect(beef.entries).toHaveLength(2);
  });
  it("keeps the January example older than the recent entry around New Year", () => {
    for (const date of ["2027-01-01", "2027-01-12", "2027-01-15", "2027-01-16"]) {
      const state = createDemoState(new Date(date + "T10:00:00Z"));
      const january = state.entries.find((entry) => entry.id === "beef-january")!;
      const recent = state.entries.find((entry) => entry.id === "beef-recent")!;
      expect(january.frozenOn.slice(5)).toBe("01-12");
      expect(january.frozenOn < recent.frozenOn).toBe(true);
      expect(recent.frozenOn <= date).toBe(true);
    }
  });
  it("takes from the oldest entry, and undo preserves its date", async () => {
    const result = await adapter.execute({
      type: "take-one",
      freezerId: DEMO_FREEZER_ID,
      itemKey: beefKey,
    });
    expect(result.snapshot.entries.find((entry) => entry.id === "beef-january")?.quantity).toBe(1);
    expect(result.snapshot.entries.find((entry) => entry.id === "beef-recent")?.quantity).toBe(1);
    const undone = await adapter.undo(result.undo!);
    expect(undone.snapshot.entries.find((entry) => entry.id === "beef-january")).toMatchObject({
      quantity: 2,
      frozenOn: "2026-01-12",
      createdAt: "2026-01-12T12:00:00.000Z",
    });
  });
  it("plus always creates a new entry dated today, even if one already exists today", async () => {
    await adapter.execute({ type: "add-one", freezerId: DEMO_FREEZER_ID, itemKey: beefKey });
    const result = await adapter.execute({
      type: "add-one",
      freezerId: DEMO_FREEZER_ID,
      itemKey: beefKey,
    });
    expect(result.snapshot.entries.filter((entry) => entry.frozenOn === "2026-09-19")).toHaveLength(
      2,
    );
    expect(result.snapshot.entries.find((entry) => entry.id === "beef-january")?.quantity).toBe(2);
    const undone = await adapter.undo(result.undo!);
    expect(undone.snapshot.entries.filter((entry) => entry.frozenOn === "2026-09-19")).toHaveLength(
      1,
    );
    expect(
      groupEntries(undone.snapshot.entries).find((item) => item.key === beefKey)?.quantity,
    ).toBe(4);
  });
  it("zero removes the exhausted entry; undo restores the exact original entry", async () => {
    await adapter.execute({ type: "take-one", freezerId: DEMO_FREEZER_ID, itemKey: beefKey });
    const result = await adapter.execute({
      type: "take-one",
      freezerId: DEMO_FREEZER_ID,
      itemKey: beefKey,
    });
    expect(result.snapshot.entries.find((entry) => entry.id === "beef-january")).toBeUndefined();
    expect(
      groupEntries(result.snapshot.entries).find((item) => item.key === beefKey)?.oldestDate,
    ).toBe("2026-09-16");
    const undone = await adapter.undo(result.undo!);
    expect(undone.snapshot.entries.find((entry) => entry.id === "beef-january")).toMatchObject({
      quantity: 1,
      frozenOn: "2026-01-12",
    });
  });
  it("edit corrects existing data without faking a new addition", async () => {
    const { entries } = await adapter.getInventory(DEMO_FREEZER_ID);
    const beef = entries.filter((entry) => itemKey(entry) === beefKey);
    const beforeOrder = selectItems(entries, "", "newest").map((item) => item.key);
    const result = await adapter.execute({
      type: "edit",
      freezerId: DEMO_FREEZER_ID,
      itemKey: beefKey,
      name: "Kjøttdeig",
      unit: "pakker",
      entries: beef.map((entry, i) =>
        correction(entry, i === 0 ? 4 : 1, i === 0 ? "2026-02-01" : entry.frozenOn),
      ),
    });
    expect(result.snapshot.entries).toHaveLength(entries.length);
    expect(result.snapshot.entries.find((entry) => entry.id === "beef-january")).toMatchObject({
      quantity: 4,
      frozenOn: "2026-02-01",
      createdAt: beef[0].createdAt,
      updatedAt: now.toISOString(),
    });
    expect(selectItems(result.snapshot.entries, "", "newest").map((item) => item.key)).toEqual(
      beforeOrder,
    );
    const undone = await adapter.undo(result.undo!);
    expect(undone.snapshot.entries.find((entry) => entry.id === "beef-january")).toEqual(beef[0]);
  });
  it("allows a mistaken entry to be corrected to zero without taking from other dates", async () => {
    const { entries } = await adapter.getInventory(DEMO_FREEZER_ID);
    const beef = entries.filter((entry) => itemKey(entry) === beefKey);
    const result = await adapter.execute({
      type: "edit",
      freezerId: DEMO_FREEZER_ID,
      itemKey: beefKey,
      name: "Kjøttdeig",
      unit: "pakker",
      entries: beef.map((entry, i) => correction(entry, i === 0 ? 0 : 1)),
    });
    expect(result.snapshot.entries.find((entry) => entry.id === "beef-january")).toBeUndefined();
    expect(result.snapshot.entries.find((entry) => entry.id === "beef-recent")).toEqual(beef[1]);
  });
  it("delete and undo preserve all dates and quantities", async () => {
    const original = await adapter.getInventory(DEMO_FREEZER_ID);
    const result = await adapter.execute({
      type: "delete",
      freezerId: DEMO_FREEZER_ID,
      itemKey: beefKey,
    });
    expect(
      groupEntries(result.snapshot.entries).find((item) => item.key === beefKey),
    ).toBeUndefined();
    const undone = await adapter.undo(result.undo!);
    expect(undone.snapshot.entries.filter((entry) => itemKey(entry) === beefKey)).toEqual(
      original.entries.filter((entry) => itemKey(entry) === beefKey),
    );
  });
  it("undo does not overwrite unrelated later additions", async () => {
    const first = await adapter.execute({
      type: "take-one",
      freezerId: DEMO_FREEZER_ID,
      itemKey: beefKey,
    });
    await adapter.execute({
      type: "add",
      freezerId: DEMO_FREEZER_ID,
      name: "Erter",
      quantity: 1,
      unit: "pakker",
      frozenOn: "2026-09-19",
    });
    const result = await adapter.undo(first.undo!);
    expect(result.snapshot.entries.some((entry) => entry.name === "Erter")).toBe(true);
    expect(result.snapshot.entries.find((entry) => entry.id === "beef-january")?.quantity).toBe(2);
  });
  it("rejects undo when a newer change touches the same entry", async () => {
    const first = await adapter.execute({
      type: "take-one",
      freezerId: DEMO_FREEZER_ID,
      itemKey: beefKey,
    });
    await adapter.execute({ type: "take-one", freezerId: DEMO_FREEZER_ID, itemKey: beefKey });
    await expect(adapter.undo(first.undo!)).rejects.toThrow("nyere endring");
  });
  it("rejects stale edit snapshots", async () => {
    const original = await adapter.getInventory(DEMO_FREEZER_ID);
    await adapter.execute({ type: "take-one", freezerId: DEMO_FREEZER_ID, itemKey: beefKey });
    await expect(
      adapter.execute({
        type: "edit",
        freezerId: DEMO_FREEZER_ID,
        itemKey: beefKey,
        name: "Kjøttdeig",
        unit: "pakker",
        entries: original.entries.filter((e) => itemKey(e) === beefKey).map((e) => correction(e)),
      }),
    ).rejects.toThrow("endret siden");
  });
  it("isolates the empty freezer and persists across adapter instances", async () => {
    expect((await adapter.getInventory(EMPTY_FREEZER_ID)).entries).toEqual([]);
    await adapter.execute({
      type: "add",
      freezerId: EMPTY_FREEZER_ID,
      name: "Suppe",
      quantity: 2,
      unit: "porsjoner",
      frozenOn: "2026-09-19",
    });
    const another = new LocalInventoryAdapter(storage, () => now);
    expect((await another.getInventory(EMPTY_FREEZER_ID)).entries[0].name).toBe("Suppe");
    expect((await another.getInventory(DEMO_FREEZER_ID)).entries).toHaveLength(6);
  });
  it("normalizes names but never mixes different units", async () => {
    await adapter.execute({
      type: "add",
      freezerId: DEMO_FREEZER_ID,
      name: "  KJØTTDEIG  ",
      quantity: 2,
      unit: "pakker",
      frozenOn: "2026-09-19",
    });
    const result = await adapter.execute({
      type: "add",
      freezerId: DEMO_FREEZER_ID,
      name: "Kjøttdeig",
      quantity: 1,
      unit: "porsjoner",
      frozenOn: "2026-09-19",
    });
    const items = selectItems(result.snapshot.entries, "kjøtt");
    expect(items).toHaveLength(2);
    expect(items.find((item) => item.unit === "pakker")?.quantity).toBe(5);
  });
  it.each([0, -1, 1.5, 1000, NaN])("rejects invalid added quantity %s", async (quantity) => {
    await expect(
      adapter.execute({
        type: "add",
        freezerId: DEMO_FREEZER_ID,
        name: "Erter",
        quantity,
        unit: "stk",
        frozenOn: "2026-09-19",
      }),
    ).rejects.toThrow("Antall");
  });
  it.each(["2026-02-31", "2026-09-20", "", "not-a-date"])(
    "rejects invalid date %s",
    async (frozenOn) => {
      await expect(
        adapter.execute({
          type: "add",
          freezerId: DEMO_FREEZER_ID,
          name: "Erter",
          quantity: 1,
          unit: "stk",
          frozenOn,
        }),
      ).rejects.toThrow("dato");
    },
  );
  it("does not claim success when storage refuses a write", async () => {
    const blocked = new LocalInventoryAdapter(
      {
        read: () => null,
        write: () => {
          throw new Error("QuotaExceededError");
        },
      },
      () => now,
    );
    await expect(
      blocked.execute({ type: "take-one", freezerId: DEMO_FREEZER_ID, itemKey: beefKey }),
    ).rejects.toThrow("ikke lagret");
  });
  it("serializes rapid local takes without losing quantities or going negative", async () => {
    const results = await Promise.allSettled(
      Array.from({ length: 5 }, () =>
        adapter.execute({ type: "take-one", freezerId: DEMO_FREEZER_ID, itemKey: beefKey }),
      ),
    );
    expect(results.filter((result) => result.status === "fulfilled")).toHaveLength(3);
    expect(
      (await adapter.getInventory(DEMO_FREEZER_ID)).entries.some(
        (entry) => itemKey(entry) === beefKey,
      ),
    ).toBe(false);
  });
  it("rename is undoable without changing inventory", async () => {
    const original = await adapter.getInventory(DEMO_FREEZER_ID);
    const renamed = await adapter.execute({
      type: "rename-freezer",
      freezerId: DEMO_FREEZER_ID,
      name: "  Fryseren i boden ",
    });
    expect(renamed.snapshot.freezer.name).toBe("Fryseren i boden");
    expect(renamed.snapshot.entries).toEqual(original.entries);
    expect((await adapter.undo(renamed.undo!)).snapshot.freezer.name).toBe(original.freezer.name);
  });
  it("uses the Oslo date across UTC midnight and daylight-saving offsets", () => {
    expect(osloToday(new Date("2026-09-19T22:30:00Z"))).toBe("2026-09-20");
    expect(osloToday(new Date("2026-01-12T23:30:00Z"))).toBe("2026-01-13");
  });
});
