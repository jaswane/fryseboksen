export type Unit = "stk" | "pakker" | "porsjoner";
export const UNITS: readonly Unit[] = ["stk", "pakker", "porsjoner"];

export interface Freezer {
  id: string;
  name: string;
}
export interface Entry {
  id: string;
  freezerId: string;
  name: string;
  unit: Unit;
  quantity: number;
  frozenOn: string;
  createdAt: string;
  updatedAt: string;
  version: number;
}
export interface InventorySnapshot {
  freezer: Freezer;
  entries: Entry[];
}
export interface InventoryItem {
  key: string;
  name: string;
  unit: Unit;
  quantity: number;
  oldestDate: string;
  latestAddedAt: string;
  entries: Entry[];
}
export type SortOrder = "oldest" | "newest";

export function osloToday(now = new Date()): string {
  return new Intl.DateTimeFormat("sv-SE", {
    timeZone: "Europe/Oslo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}
export function normalizeName(value: string): string {
  return value.normalize("NFKC").trim().replace(/\s+/g, " ").toLocaleLowerCase("nb-NO");
}
export function cleanName(value: string): string {
  return value.normalize("NFKC").trim().replace(/\s+/g, " ");
}
export function itemKey(entry: Pick<Entry, "name" | "unit" | "freezerId">): string {
  return JSON.stringify([entry.freezerId, normalizeName(entry.name), entry.unit]);
}
export function compareOldest(a: Entry, b: Entry): number {
  return (
    a.frozenOn.localeCompare(b.frozenOn) ||
    a.createdAt.localeCompare(b.createdAt) ||
    a.id.localeCompare(b.id)
  );
}
export function groupEntries(entries: readonly Entry[]): InventoryItem[] {
  const groups = new Map<string, Entry[]>();
  for (const entry of entries) {
    const key = itemKey(entry);
    groups.set(key, [...(groups.get(key) ?? []), entry]);
  }
  return [...groups.entries()].map(([key, values]) => {
    const ordered = [...values].sort(compareOldest);
    return {
      key,
      name: ordered[0].name,
      unit: ordered[0].unit,
      quantity: ordered.reduce((sum, entry) => sum + entry.quantity, 0),
      oldestDate: ordered[0].frozenOn,
      latestAddedAt: ordered.reduce(
        (latest, entry) => (entry.createdAt > latest ? entry.createdAt : latest),
        ordered[0].createdAt,
      ),
      entries: ordered,
    };
  });
}
export function selectItems(
  entries: readonly Entry[],
  query = "",
  sort: SortOrder = "oldest",
): InventoryItem[] {
  const search = normalizeName(query);
  return groupEntries(entries)
    .filter((item) => normalizeName(item.name).includes(search))
    .sort(
      (a, b) =>
        (sort === "oldest"
          ? a.oldestDate.localeCompare(b.oldestDate)
          : b.latestAddedAt.localeCompare(a.latestAddedAt)) || a.name.localeCompare(b.name, "nb"),
    );
}
export function formatDate(value: string, includeYear = false): string {
  return new Intl.DateTimeFormat("nb-NO", {
    day: "numeric",
    month: "long",
    ...(includeYear ? { year: "numeric" } : {}),
    timeZone: "UTC",
  }).format(new Date(value + "T12:00:00Z"));
}
export function formatQuantity(quantity: number, unit: Unit): string {
  const label =
    unit === "pakker" && quantity === 1
      ? "pakke"
      : unit === "porsjoner" && quantity === 1
        ? "porsjon"
        : unit;
  return quantity + " " + label;
}
export function validateEntryInput(
  name: string,
  quantity: number,
  frozenOn: string,
  unit: Unit,
  today: string,
): void {
  if (!cleanName(name) || cleanName(name).length > 80)
    throw new Error("Skriv et varenavn på mellom 1 og 80 tegn.");
  if (!Number.isInteger(quantity) || quantity < 1 || quantity > 999)
    throw new Error("Antall må være et helt tall mellom 1 og 999.");
  if (!UNITS.includes(unit)) throw new Error("Velg en gyldig enhet.");
  const date = new Date(frozenOn + "T12:00:00Z");
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(frozenOn) ||
    Number.isNaN(date.valueOf()) ||
    date.toISOString().slice(0, 10) !== frozenOn ||
    frozenOn > today ||
    frozenOn < "1900-01-01"
  ) {
    throw new Error("Velg en gyldig innfrysingsdato som ikke er i fremtiden.");
  }
}
