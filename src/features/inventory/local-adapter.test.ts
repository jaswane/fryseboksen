import { describe, expect, it } from "vitest";
import { LocalInventoryAdapter, type DemoStorage } from "./local-adapter";
import { createDemoState, DEMO_FREEZER_ID, EMPTY_FREEZER_ID } from "./demo-seed";
import { describeInventoryContract, type ContractHarness } from "./contract-suite";
import { groupEntries, itemKey, osloToday } from "./domain";

const now = new Date("2026-09-19T10:00:00.000Z");
const FIRST = "contract-freezer-a";
const SECOND = "contract-freezer-b";

function memoryStorage(initial: string | null = null): DemoStorage {
  let value = initial;
  return {
    read: () => value,
    write: (next) => {
      value = next;
    },
  };
}

/** Two empty freezers, so the shared suite starts from a known blank slate. */
const localHarness: ContractHarness = {
  async create() {
    const storage = memoryStorage(
      JSON.stringify({
        schemaVersion: 1,
        freezers: [
          { id: FIRST, name: "Fryseren hjemme" },
          { id: SECOND, name: "Min fryser" },
        ],
        entries: [],
      }),
    );
    return {
      adapter: new LocalInventoryAdapter(storage, () => now),
      freezerId: FIRST,
      otherFreezerId: SECOND,
      today: osloToday(now),
    };
  },
};

describe("inventory contract (local adapter)", () => {
  describeInventoryContract(localHarness);
});

describe("local adapter specifics", () => {
  const demoAdapter = () => new LocalInventoryAdapter(memoryStorage(), () => now);

  it("groups the two January packages and the recent one into a single row", async () => {
    const { entries } = await demoAdapter().getInventory(DEMO_FREEZER_ID);
    const items = groupEntries(entries);
    expect(items).toHaveLength(5);
    const beef = items.find((item) => item.key === itemKey(entries[0]))!;
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

  it("isolates the empty freezer and persists across adapter instances", async () => {
    const storage = memoryStorage();
    const adapter = new LocalInventoryAdapter(storage, () => now);
    expect((await adapter.getInventory(EMPTY_FREEZER_ID)).entries).toEqual([]);
    await adapter.execute({
      type: "add",
      freezerId: EMPTY_FREEZER_ID,
      name: "Suppe",
      quantity: 2,
      unit: "porsjoner",
      frozenOn: "2026-09-19",
      requestId: crypto.randomUUID(),
    });
    const another = new LocalInventoryAdapter(storage, () => now);
    expect((await another.getInventory(EMPTY_FREEZER_ID)).entries[0].name).toBe("Suppe");
    expect((await another.getInventory(DEMO_FREEZER_ID)).entries).toHaveLength(6);
  });

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
    const { entries } = await blocked.getInventory(DEMO_FREEZER_ID);
    await expect(
      blocked.execute({
        type: "take-one",
        freezerId: DEMO_FREEZER_ID,
        itemKey: itemKey(entries[0]),
        requestId: crypto.randomUUID(),
      }),
    ).rejects.toThrow("ikke lagret");
  });

  it("reports unreadable demo data instead of silently starting over", async () => {
    const adapter = new LocalInventoryAdapter(memoryStorage("{not json"), () => now);
    await expect(adapter.getInventory(DEMO_FREEZER_ID)).rejects.toThrow("kunne ikke leses");
  });

  it("uses the Oslo date across UTC midnight and daylight-saving offsets", () => {
    expect(osloToday(new Date("2026-09-19T22:30:00Z"))).toBe("2026-09-20");
    expect(osloToday(new Date("2026-01-12T23:30:00Z"))).toBe("2026-01-13");
    expect(osloToday(new Date("2026-06-30T21:59:00Z"))).toBe("2026-06-30");
    expect(osloToday(new Date("2026-06-30T22:01:00Z"))).toBe("2026-07-01");
  });
});
