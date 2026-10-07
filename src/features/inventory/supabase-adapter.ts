import type { PostgrestError, SupabaseClient } from "@supabase/supabase-js";
import type {
  InventoryAdapter,
  InventoryCommand,
  MutationResult,
  UndoReceipt,
} from "./adapter";
import type { Freezer, InventorySnapshot } from "./domain";
import { parseItemKey, toFreezerList, toSnapshot } from "./mapping";

const GENERIC = "Endringen ble ikke lagret. Prøv igjen om et øyeblikk.";
const OFFLINE = "Vi fikk ikke kontakt med Fryseboksen. Sjekk nettforbindelsen og prøv igjen.";

/**
 * Errors the database raises on purpose carry an FB sqlstate and a sentence
 * written for a person. Everything else is a bug or an outage, and is reported
 * as such rather than leaking internals into the interface.
 */
function isIntentional(error: PostgrestError): boolean {
  return /^FB\d{3}$/.test(error.code ?? "");
}
function isTransient(error: PostgrestError): boolean {
  const code = error.code ?? "";
  if (code === "" || code === "ECONNRESET") return true;
  // Postgres class 40: serialization failure and deadlock, both worth retrying.
  return /^40\d{3}$/.test(code) || /^5\d{2}$/.test(code);
}

interface MutationRow {
  snapshot: unknown;
  message: unknown;
  undo: unknown;
}

function toMutationResult(value: unknown): MutationResult {
  const row = value as MutationRow | null;
  if (!row || typeof row !== "object") throw new Error(GENERIC);
  const undo = row.undo as { id?: unknown; label?: unknown } | null;
  return {
    snapshot: toSnapshot(row.snapshot),
    message: typeof row.message === "string" ? row.message : "",
    undo:
      undo && typeof undo.id === "string"
        ? { id: undo.id, label: typeof undo.label === "string" ? undo.label : "" }
        : null,
  };
}

/**
 * The same contract as the local demo adapter, served by Postgres.
 *
 * All of the product logic — oldest-first withdrawal, today's Oslo date, the
 * version checks, the undo conflict check — lives in the database functions,
 * not here. This class parses, calls and translates. That is what lets a
 * future native app reuse the rules instead of reimplementing them.
 */
export class SupabaseInventoryAdapter implements InventoryAdapter {
  constructor(private client: SupabaseClient) {}

  /**
   * A request id makes a retry safe, so a dropped response is retried rather
   * than shown as a failure the person has to judge for themselves.
   */
  private async rpc(fn: string, args: Record<string, unknown>): Promise<unknown> {
    let last: PostgrestError | null = null;
    for (let attempt = 0; attempt < 3; attempt += 1) {
      const { data, error } = await this.client.rpc(fn, args);
      if (!error) return data;
      if (isIntentional(error)) throw new Error(error.message);
      last = error;
      if (!isTransient(error)) break;
      await new Promise((resolve) => setTimeout(resolve, 120 * (attempt + 1)));
    }
    throw new Error(last && isTransient(last) ? OFFLINE : GENERIC);
  }

  async listFreezers(): Promise<Freezer[]> {
    return toFreezerList(await this.rpc("app_list_freezers", {}));
  }

  async getInventory(freezerId: string): Promise<InventorySnapshot> {
    return toSnapshot(await this.rpc("app_snapshot", { p_freezer: freezerId }));
  }

  async execute(command: InventoryCommand): Promise<MutationResult> {
    const base = { p_freezer: command.freezerId, p_request: command.requestId };
    switch (command.type) {
      case "add":
        return toMutationResult(
          await this.rpc("app_add_lot", {
            ...base,
            p_name: command.name,
            p_quantity: Number.isFinite(command.quantity) ? command.quantity : null,
            p_unit: command.unit,
            p_frozen_on: command.frozenOn,
          }),
        );
      case "add-one": {
        const { nameKey, unit } = parseItemKey(command.itemKey, command.freezerId);
        return toMutationResult(
          await this.rpc("app_add_one", { ...base, p_name_key: nameKey, p_unit: unit }),
        );
      }
      case "take-one": {
        const { nameKey, unit } = parseItemKey(command.itemKey, command.freezerId);
        return toMutationResult(
          await this.rpc("app_take_one", { ...base, p_name_key: nameKey, p_unit: unit }),
        );
      }
      case "edit": {
        const { nameKey, unit } = parseItemKey(command.itemKey, command.freezerId);
        return toMutationResult(
          await this.rpc("app_edit_item", {
            ...base,
            p_name_key: nameKey,
            p_unit: unit,
            p_name: command.name,
            p_new_unit: command.unit,
            p_entries: command.entries.map((entry) => ({
              id: entry.id,
              quantity: Number.isFinite(entry.quantity) ? entry.quantity : null,
              frozenOn: entry.frozenOn,
              expectedVersion: entry.expectedVersion,
            })),
          }),
        );
      }
      case "delete": {
        const { nameKey, unit } = parseItemKey(command.itemKey, command.freezerId);
        return toMutationResult(
          await this.rpc("app_delete_item", { ...base, p_name_key: nameKey, p_unit: unit }),
        );
      }
      case "rename-freezer":
        return toMutationResult(
          await this.rpc("app_rename_freezer", { ...base, p_name: command.name }),
        );
    }
  }

  async undo(receipt: UndoReceipt): Promise<MutationResult> {
    return toMutationResult(await this.rpc("app_undo", { p_receipt: receipt.id }));
  }
}
