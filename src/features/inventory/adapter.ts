import type { Freezer, InventorySnapshot, Unit } from "./domain";

export interface EntryCorrection {
  id: string;
  quantity: number;
  frozenOn: string;
  expectedVersion: number;
}

/** What the interface produces. The adapter adds an identity for safe retries. */
export type InventoryCommandInput =
  | { type: "add"; freezerId: string; name: string; quantity: number; unit: Unit; frozenOn: string }
  | { type: "add-one"; freezerId: string; itemKey: string }
  | { type: "take-one"; freezerId: string; itemKey: string }
  | {
      type: "edit";
      freezerId: string;
      itemKey: string;
      name: string;
      unit: Unit;
      entries: EntryCorrection[];
    }
  | { type: "delete"; freezerId: string; itemKey: string }
  | { type: "rename-freezer"; freezerId: string; name: string };

/**
 * `requestId` identifies one user action. Repeating it must repeat the answer,
 * never the effect: plus and minus are not idempotent on their own.
 */
export type InventoryCommand = InventoryCommandInput & { requestId: string };

export interface UndoReceipt {
  id: string;
  label: string;
}
export interface MutationResult {
  snapshot: InventorySnapshot;
  message: string;
  undo: UndoReceipt | null;
}

/** UI contract. A future remote implementation owns authorization and atomicity. */
export interface InventoryAdapter {
  listFreezers(): Promise<Freezer[]>;
  getInventory(freezerId: string): Promise<InventorySnapshot>;
  execute(command: InventoryCommand): Promise<MutationResult>;
  undo(receipt: UndoReceipt): Promise<MutationResult>;
}
