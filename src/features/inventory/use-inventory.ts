"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import type {
  InventoryAdapter,
  InventoryCommandInput,
  MutationResult,
  UndoReceipt,
} from "./adapter";
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

  /**
   * A second device can change the same freezer. Re-reading on return keeps the
   * open page close to the server and turns avoidable conflicts into no-ops.
   * It stays silent: no spinner, no cleared message, no error banner.
   */
  useEffect(() => {
    const refresh = () => {
      if (lock.current || document.visibilityState !== "visible") return;
      const ticket = request.current;
      const id = activeId.current;
      void adapter
        .getInventory(id)
        .then((data) => {
          if (ticket === request.current && !lock.current && activeId.current === id)
            setSnapshot(data);
        })
        .catch(() => {});
    };
    window.addEventListener("focus", refresh);
    document.addEventListener("visibilitychange", refresh);
    return () => {
      window.removeEventListener("focus", refresh);
      document.removeEventListener("visibilitychange", refresh);
    };
  }, [adapter]);

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
    // One click is one request id, so a transport-level retry cannot apply twice.
    execute: (command: InventoryCommandInput) =>
      mutate(() => adapter.execute({ ...command, requestId: crypto.randomUUID() })),
    undo: () => (notice?.undo ? mutate(() => adapter.undo(notice.undo!)) : Promise.resolve(false)),
  };
}
