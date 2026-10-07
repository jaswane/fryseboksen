import type { InventoryAdapter, InventoryCommand, MutationResult, UndoReceipt } from "./adapter";
import {
  cleanName,
  compareOldest,
  itemKey,
  osloToday,
  validateEntryInput,
  type Entry,
  type Freezer,
  type InventorySnapshot,
} from "./domain";
import { createDemoState, type DemoState } from "./demo-seed";

export interface DemoStorage {
  read(): string | null;
  write(value: string): void;
}
const STORAGE_KEY = "fryseboksen.demo.v1";
export function browserDemoStorage(): DemoStorage {
  return {
    read: () => window.localStorage.getItem(STORAGE_KEY),
    write: (value) => window.localStorage.setItem(STORAGE_KEY, value),
  };
}
interface Patch {
  freezerId: string;
  before: Entry[];
  after: Entry[];
  freezerBefore?: Freezer;
  freezerAfter?: Freezer;
}
const copy = <T>(value: T): T => structuredClone(value);
const equal = (a: unknown, b: unknown): boolean => JSON.stringify(a) === JSON.stringify(b);

/** Keeps a replay log small without letting it expire while the page is open. */
function remember<T>(log: Map<string, T>, key: string, value: T): T {
  log.set(key, value);
  if (log.size > 50) log.delete(log.keys().next().value!);
  return value;
}

export class LocalInventoryAdapter implements InventoryAdapter {
  private receipts = new Map<string, Patch>();
  /** Replayed answers. A repeated request id must never repeat the effect. */
  private commands = new Map<string, MutationResult>();
  private undone = new Map<string, MutationResult>();
  constructor(
    private storage: DemoStorage,
    private clock: () => Date = () => new Date(),
  ) {}

  private read(): DemoState {
    let raw: string | null;
    try {
      raw = this.storage.read();
    } catch {
      throw new Error(
        "Nettleseren tillater ikke lokal lagring. Tillat nettsteddata for å bruke demoen.",
      );
    }
    if (!raw) return createDemoState(this.clock());
    try {
      const state = JSON.parse(raw) as DemoState;
      if (
        state.schemaVersion !== 1 ||
        !Array.isArray(state.freezers) ||
        !Array.isArray(state.entries)
      )
        throw new Error();
      if (state.freezers.length !== 2 || new Set(state.freezers.map((f) => f.id)).size !== 2)
        throw new Error();
      for (const freezer of state.freezers) {
        if (
          typeof freezer.id !== "string" ||
          typeof freezer.name !== "string" ||
          !freezer.name.trim()
        )
          throw new Error();
      }
      const ids = new Set<string>();
      for (const entry of state.entries) {
        if (
          typeof entry.id !== "string" ||
          ids.has(entry.id) ||
          !state.freezers.some((f) => f.id === entry.freezerId) ||
          !Number.isInteger(entry.version) ||
          entry.version < 1
        )
          throw new Error();
        ids.add(entry.id);
        if (
          !Number.isFinite(Date.parse(entry.createdAt)) ||
          !Number.isFinite(Date.parse(entry.updatedAt))
        )
          throw new Error();
        // Stored dates remain valid if the device clock later changes.
        validateEntryInput(entry.name, entry.quantity, entry.frozenOn, entry.unit, "9999-12-31");
      }
      return state;
    } catch {
      throw new Error(
        "Demodataene kunne ikke leses. Du kan tilbakestille demoen og begynne på nytt.",
      );
    }
  }
  private save(state: DemoState): void {
    try {
      this.storage.write(JSON.stringify(state));
    } catch {
      throw new Error(
        "Endringen ble ikke lagret. Nettleserens lokale lagring er full eller blokkert.",
      );
    }
  }
  private snapshot(state: DemoState, freezerId: string): InventorySnapshot {
    const freezer = state.freezers.find((value) => value.id === freezerId);
    if (!freezer) throw new Error("Fant ikke fryseren.");
    return copy({
      freezer,
      entries: state.entries.filter((entry) => entry.freezerId === freezerId),
    });
  }
  async listFreezers(): Promise<Freezer[]> {
    return copy(this.read().freezers);
  }
  async getInventory(freezerId: string): Promise<InventorySnapshot> {
    return this.snapshot(this.read(), freezerId);
  }

  async execute(command: InventoryCommand): Promise<MutationResult> {
    const replay = this.commands.get(command.requestId);
    if (replay) return copy(replay);
    const state = this.read();
    this.snapshot(state, command.freezerId);
    const previous = copy(state);
    const actionTime = this.clock();
    const now = actionTime.toISOString();
    const today = osloToday(actionTime);
    const makeEntry = (
      name: string,
      quantity: number,
      frozenOn: string,
      unit: Entry["unit"],
    ): Entry => ({
      id: crypto.randomUUID(),
      freezerId: command.freezerId,
      name: cleanName(name),
      quantity,
      frozenOn,
      unit,
      createdAt: now,
      updatedAt: now,
      version: 1,
    });
    let message = "";
    if (command.type === "add") {
      validateEntryInput(command.name, command.quantity, command.frozenOn, command.unit, today);
      state.entries.push(makeEntry(command.name, command.quantity, command.frozenOn, command.unit));
      message = cleanName(command.name) + " er lagt til.";
    } else if (command.type === "rename-freezer") {
      const name = cleanName(command.name);
      if (!name || name.length > 60) throw new Error("Frysernavnet må ha mellom 1 og 60 tegn.");
      state.freezers = state.freezers.map((f) => (f.id === command.freezerId ? { ...f, name } : f));
      message = "Frysernavnet er endret.";
    } else {
      const entries = state.entries
        .filter(
          (entry) => entry.freezerId === command.freezerId && itemKey(entry) === command.itemKey,
        )
        .sort(compareOldest);
      if (!entries.length)
        throw new Error("Varen finnes ikke lenger. Oppdater oversikten og prøv igjen.");
      const first = entries[0];
      if (command.type === "add-one") {
        state.entries.push(makeEntry(first.name, 1, today, first.unit));
        message = first.name + ": én lagt inn i dag.";
      } else if (command.type === "take-one") {
        if (first.quantity === 1)
          state.entries = state.entries.filter((entry) => entry.id !== first.id);
        else {
          first.quantity -= 1;
          first.updatedAt = now;
          first.version += 1;
        }
        message = first.name + ": én tatt ut fra eldste innlegging.";
      } else if (command.type === "delete") {
        const ids = new Set(entries.map((entry) => entry.id));
        state.entries = state.entries.filter((entry) => !ids.has(entry.id));
        message = first.name + " er slettet.";
      } else if (command.type === "edit") {
        if (
          command.entries.length !== entries.length ||
          new Set(command.entries.map((e) => e.id)).size !== entries.length
        )
          throw new Error("Varen er endret siden du åpnet den. Lukk og åpne Rediger igjen.");
        for (const correction of command.entries) {
          const entry = entries.find((value) => value.id === correction.id);
          if (!entry || entry.version !== correction.expectedVersion)
            throw new Error("Varen er endret siden du åpnet den. Lukk og åpne Rediger igjen.");
          if (
            !Number.isInteger(correction.quantity) ||
            correction.quantity < 0 ||
            correction.quantity > 999
          )
            throw new Error("Antall må være et helt tall mellom 0 og 999.");
          validateEntryInput(
            command.name,
            correction.quantity || 1,
            correction.frozenOn,
            command.unit,
            today,
          );
          if (
            entry.name !== cleanName(command.name) ||
            entry.unit !== command.unit ||
            entry.quantity !== correction.quantity ||
            entry.frozenOn !== correction.frozenOn
          ) {
            entry.name = cleanName(command.name);
            entry.unit = command.unit;
            entry.quantity = correction.quantity;
            entry.frozenOn = correction.frozenOn;
            entry.updatedAt = now;
            entry.version += 1;
          }
        }
        state.entries = state.entries.filter((entry) => entry.quantity > 0);
        message = cleanName(command.name) + " er korrigert.";
      }
    }
    const changedIds = new Set([
      ...previous.entries
        .filter(
          (entry) =>
            !equal(
              entry,
              state.entries.find((value) => value.id === entry.id),
            ),
        )
        .map((entry) => entry.id),
      ...state.entries
        .filter((entry) => !previous.entries.some((value) => value.id === entry.id))
        .map((entry) => entry.id),
    ]);
    const patch: Patch = {
      freezerId: command.freezerId,
      before: previous.entries.filter((entry) => changedIds.has(entry.id)),
      after: state.entries.filter((entry) => changedIds.has(entry.id)),
      ...(command.type === "rename-freezer"
        ? {
            freezerBefore: previous.freezers.find((f) => f.id === command.freezerId),
            freezerAfter: state.freezers.find((f) => f.id === command.freezerId),
          }
        : {}),
    };
    this.save(state);
    const id = crypto.randomUUID();
    remember(this.receipts, id, copy(patch));
    return copy(
      remember(this.commands, command.requestId, {
        snapshot: this.snapshot(state, command.freezerId),
        message,
        undo: { id, label: message },
      }),
    );
  }

  async undo(receipt: UndoReceipt): Promise<MutationResult> {
    const replay = this.undone.get(receipt.id);
    if (replay) return copy(replay);
    const patch = this.receipts.get(receipt.id);
    if (!patch) throw new Error("Denne endringen kan ikke angres lenger.");
    const state = this.read();
    const ids = new Set([...patch.before, ...patch.after].map((entry) => entry.id));
    for (const id of ids) {
      if (
        !equal(
          state.entries.find((entry) => entry.id === id),
          patch.after.find((entry) => entry.id === id),
        )
      ) {
        throw new Error("Varen er endret igjen. Angre ville overskrevet en nyere endring.");
      }
    }
    if (
      patch.freezerAfter &&
      !equal(
        state.freezers.find((f) => f.id === patch.freezerId),
        patch.freezerAfter,
      )
    ) {
      throw new Error("Frysernavnet er endret igjen. Den eldre endringen kan ikke angres.");
    }
    state.entries = [...state.entries.filter((entry) => !ids.has(entry.id)), ...copy(patch.before)];
    if (patch.freezerBefore)
      state.freezers = state.freezers.map((f) =>
        f.id === patch.freezerId ? copy(patch.freezerBefore!) : f,
      );
    this.save(state);
    this.receipts.delete(receipt.id);
    return copy(
      remember(this.undone, receipt.id, {
        snapshot: this.snapshot(state, patch.freezerId),
        message: "Endringen er angret.",
        undo: null,
      }),
    );
  }
  /** Demo-only control. It is deliberately not part of the production adapter contract. */
  async resetDemo(): Promise<void> {
    this.save(createDemoState(this.clock()));
    this.receipts.clear();
    this.commands.clear();
    this.undone.clear();
  }
}
