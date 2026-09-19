"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import type { InventoryAdapter, InventoryCommand, MutationResult, UndoReceipt } from "./adapter";
import type { Freezer, InventorySnapshot } from "./domain";

export function useInventory(adapter: InventoryAdapter, initialFreezerId: string) {
  const [freezers, setFreezers] = useState<Freezer[]>([]);
  const [snapshot, setSnapshot] = useState<InventorySnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState<{ message: string; undo: UndoReceipt | null } | null>(null);
  const lock = useRef(false);
  const request = useRef(0);
  const activeId = useRef(initialFreezerId);

  const load = useCallback(
    async (id: string) => {
      if (lock.current) return;
      const ticket = ++request.current;
      activeId.current = id;
      setLoading(true);
      setError("");
      setNotice(null);
      try {
        const [choices, data] = await Promise.all([
          adapter.listFreezers(),
          adapter.getInventory(id),
        ]);
        if (ticket !== request.current) return;
        setFreezers(choices);
        setSnapshot(data);
      } catch (e) {
        if (ticket === request.current)
          setError(e instanceof Error ? e.message : "Kunne ikke åpne fryseren.");
      } finally {
        if (ticket === request.current) setLoading(false);
      }
    },
    [adapter],
  );

  useEffect(() => {
    let cancelled = false;
    const ticket = ++request.current;
    void Promise.all([adapter.listFreezers(), adapter.getInventory(initialFreezerId)])
      .then(([choices, data]) => {
        if (cancelled || ticket !== request.current) return;
        setFreezers(choices);
        setSnapshot(data);
      })
      .catch((e: unknown) => {
        if (!cancelled && ticket === request.current)
          setError(e instanceof Error ? e.message : "Kunne ikke åpne fryseren.");
      })
      .finally(() => {
        if (!cancelled && ticket === request.current) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [adapter, initialFreezerId]);

  const mutate = useCallback(async (action: () => Promise<MutationResult>): Promise<boolean> => {
    if (lock.current) return false;
    lock.current = true;
    setBusy(true);
    setError("");
    try {
      const result = await action();
      setSnapshot(result.snapshot);
      setFreezers((values) =>
        values.map((freezer) =>
          freezer.id === result.snapshot.freezer.id ? result.snapshot.freezer : freezer,
        ),
      );
      setNotice({ message: result.message, undo: result.undo });
      return true;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Endringen ble ikke lagret.");
      return false;
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }, []);

  return {
    freezers,
    snapshot,
    loading,
    busy,
    error,
    notice,
    load,
    clearNotice: () => setNotice(null),
    clearError: () => setError(""),
    reload: () => load(activeId.current),
    execute: (command: InventoryCommand) => mutate(() => adapter.execute(command)),
    undo: () => (notice?.undo ? mutate(() => adapter.undo(notice.undo!)) : Promise.resolve(false)),
  };
}
