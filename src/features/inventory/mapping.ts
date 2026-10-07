import { UNITS, type Entry, type Freezer, type InventorySnapshot, type Unit } from "./domain";

/**
 * The interface builds an item key as JSON.stringify([freezerId, name, unit]).
 * That string travels to the server, so it is parsed here and checked against
 * the freezer the command is actually for. The freezer id inside the key is
 * never used to decide anything: the command carries its own, and the database
 * decides access from the session.
 */
export function parseItemKey(key: string, freezerId: string): { nameKey: string; unit: Unit } {
  let parsed: unknown;
  try {
    parsed = JSON.parse(key);
  } catch {
    throw new Error("Varen finnes ikke lenger. Oppdater oversikten og prøv igjen.");
  }
  if (!Array.isArray(parsed) || parsed.length !== 3) {
    throw new Error("Varen finnes ikke lenger. Oppdater oversikten og prøv igjen.");
  }
  const [keyFreezerId, nameKey, unit] = parsed as unknown[];
  if (typeof keyFreezerId !== "string" || keyFreezerId !== freezerId) {
    throw new Error("Varen hører til en annen fryser. Oppdater oversikten og prøv igjen.");
  }
  if (typeof nameKey !== "string" || typeof unit !== "string" || !UNITS.includes(unit as Unit)) {
    throw new Error("Varen finnes ikke lenger. Oppdater oversikten og prøv igjen.");
  }
  return { nameKey, unit: unit as Unit };
}

const BAD_SHAPE = "Svaret fra serveren kunne ikke leses. Oppdater oversikten og prøv igjen.";

function asRecord(value: unknown): Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value))
    throw new Error(BAD_SHAPE);
  return value as Record<string, unknown>;
}
function asString(value: unknown): string {
  if (typeof value !== "string") throw new Error(BAD_SHAPE);
  return value;
}
function asInteger(value: unknown): number {
  if (typeof value !== "number" || !Number.isInteger(value)) throw new Error(BAD_SHAPE);
  return value;
}

export function toFreezer(value: unknown): Freezer {
  const row = asRecord(value);
  return { id: asString(row.id), name: asString(row.name) };
}

export function toEntry(value: unknown): Entry {
  const row = asRecord(value);
  const unit = asString(row.unit);
  if (!UNITS.includes(unit as Unit)) throw new Error(BAD_SHAPE);
  return {
    id: asString(row.id),
    freezerId: asString(row.freezerId),
    name: asString(row.name),
    unit: unit as Unit,
    quantity: asInteger(row.quantity),
    frozenOn: asString(row.frozenOn),
    createdAt: asString(row.createdAt),
    updatedAt: asString(row.updatedAt),
    version: asInteger(row.version),
  };
}

export function toSnapshot(value: unknown): InventorySnapshot {
  const row = asRecord(value);
  if (!Array.isArray(row.entries)) throw new Error(BAD_SHAPE);
  return { freezer: toFreezer(row.freezer), entries: row.entries.map(toEntry) };
}

export function toFreezerList(value: unknown): Freezer[] {
  if (!Array.isArray(value)) throw new Error(BAD_SHAPE);
  return value.map(toFreezer);
}
