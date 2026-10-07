import { describe, expect, it } from "vitest";
import { parseItemKey, toEntry, toFreezerList, toSnapshot } from "./mapping";
import { itemKey } from "./domain";

const FREEZER = "7a1f2f2c-0000-4000-8000-000000000001";
const OTHER = "7a1f2f2c-0000-4000-8000-000000000002";

const entry = {
  id: "11111111-0000-4000-8000-000000000001",
  freezerId: FREEZER,
  name: "Kjøttdeig",
  unit: "pakker",
  quantity: 2,
  frozenOn: "2026-01-12",
  createdAt: "2026-01-12T12:00:00.000Z",
  updatedAt: "2026-01-12T12:00:00.000Z",
  version: 1,
};

describe("item key parsing", () => {
  it("reads the normalized name and unit the interface produced", () => {
    const key = itemKey({ freezerId: FREEZER, name: "  KJØTTDEIG ", unit: "pakker" });
    expect(parseItemKey(key, FREEZER)).toEqual({ nameKey: "kjøttdeig", unit: "pakker" });
  });

  it("refuses a key that points at another freezer", () => {
    const key = itemKey({ freezerId: OTHER, name: "Kjøttdeig", unit: "pakker" });
    expect(() => parseItemKey(key, FREEZER)).toThrow("annen fryser");
  });

  it.each([
    ["not json", "ikke json"],
    ['["only","two"]', "for kort"],
    [JSON.stringify([FREEZER, "kjøttdeig", "kilo"]), "ukjent enhet"],
    [JSON.stringify([1, "kjøttdeig", "pakker"]), "ikke-tekst fryser"],
  ])("refuses a malformed key (%s)", (key) => {
    expect(() => parseItemKey(key, FREEZER)).toThrow();
  });
});

describe("server shapes", () => {
  it("maps an entry", () => {
    expect(toEntry(entry)).toEqual({ ...entry, unit: "pakker" });
  });

  it("maps a snapshot", () => {
    const snapshot = toSnapshot({
      freezer: { id: FREEZER, name: "Min fryser" },
      entries: [entry],
    });
    expect(snapshot.freezer.name).toBe("Min fryser");
    expect(snapshot.entries).toHaveLength(1);
  });

  it("maps a freezer list", () => {
    expect(toFreezerList([{ id: FREEZER, name: "Min fryser" }])).toHaveLength(1);
  });

  it.each([
    { ...entry, quantity: 2.5 },
    { ...entry, unit: "kilo" },
    { ...entry, version: null },
    { ...entry, id: 12 },
  ])("refuses an entry that is not the shape it claims", (broken) => {
    expect(() => toEntry(broken)).toThrow("kunne ikke leses");
  });

  it("refuses a snapshot without entries", () => {
    expect(() => toSnapshot({ freezer: { id: FREEZER, name: "x" } })).toThrow("kunne ikke leses");
  });
});
