import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type pg from "pg";
import type { SupabaseClient } from "@supabase/supabase-js";
import { randomUUID } from "node:crypto";
import {
  createFreezer,
  createTestUser,
  deleteFreezer,
  deleteTestUser,
  hasDatabase,
  osloToday,
  pgClient,
  signIn,
  skipReason,
  type TestUser,
} from "../support/supabase";

/**
 * Two sessions, the same freezer, the same moment.
 *
 * Every case here goes through PostgREST twice in parallel, so these are real
 * concurrent transactions rather than two calls on one connection.
 */
const suite = hasDatabase() ? describe : describe.skip;

interface Entry {
  id: string;
  name: string;
  quantity: number;
  frozenOn: string;
  version: number;
}
interface Snapshot {
  entries: Entry[];
}
interface Mutation {
  snapshot: Snapshot;
  message: string;
  undo: { id: string } | null;
}

suite("two sessions at once", () => {
  let admin: pg.Client;
  let user: TestUser;
  let first: SupabaseClient;
  let second: SupabaseClient;
  let today: string;
  let older: string;

  beforeAll(async () => {
    admin = pgClient();
    await admin.connect();
    today = await osloToday(admin);
    const back = new Date(today + "T12:00:00Z");
    back.setUTCDate(back.getUTCDate() - 30);
    older = back.toISOString().slice(0, 10);
    user = await createTestUser("race");
    // Two independent sessions for one person: a phone and a laptop.
    first = await signIn(user);
    second = await signIn(user);
  }, 90000);

  afterAll(async () => {
    await first?.auth.signOut();
    await second?.auth.signOut();
    if (user) await deleteTestUser(user.id);
    await admin?.end();
  }, 90000);

  async function freezerWith(entries: { quantity: number; frozenOn: string }[]): Promise<string> {
    const freezer = await createFreezer(admin, user.id, "Fryseren hjemme");
    for (const entry of entries) {
      const { error } = await first.rpc("app_add_lot", {
        p_freezer: freezer,
        p_name: "Kjøttdeig",
        p_quantity: entry.quantity,
        p_unit: "pakker",
        p_frozen_on: entry.frozenOn,
        p_request: randomUUID(),
      });
      if (error) throw new Error(error.message);
    }
    return freezer;
  }

  const take = (client: SupabaseClient, freezer: string) =>
    client.rpc("app_take_one", {
      p_freezer: freezer,
      p_name_key: "kjøttdeig",
      p_unit: "pakker",
      p_request: randomUUID(),
    });

  async function entriesIn(freezer: string): Promise<Entry[]> {
    const { data, error } = await first.rpc("app_snapshot", { p_freezer: freezer });
    if (error) throw new Error(error.message);
    return (data as Snapshot).entries;
  }

  it("two simultaneous minus against two units leave nothing and nothing negative", async () => {
    const freezer = await freezerWith([{ quantity: 2, frozenOn: older }]);
    try {
      const results = await Promise.all([take(first, freezer), take(second, freezer)]);
      expect(results.filter((result) => !result.error)).toHaveLength(2);
      expect(await entriesIn(freezer)).toEqual([]);
    } finally {
      await deleteFreezer(admin, freezer);
    }
  }, 60000);

  it("two simultaneous minus against one unit let exactly one through", async () => {
    const freezer = await freezerWith([{ quantity: 1, frozenOn: older }]);
    try {
      const results = await Promise.all([take(first, freezer), take(second, freezer)]);
      const ok = results.filter((result) => !result.error);
      const failed = results.filter((result) => result.error);
      expect(ok).toHaveLength(1);
      expect(failed).toHaveLength(1);
      expect(failed[0].error?.message).toContain("finnes ikke lenger");
      expect(await entriesIn(freezer)).toEqual([]);
    } finally {
      await deleteFreezer(admin, freezer);
    }
  }, 60000);

  it("takes the oldest first even when several minus arrive together", async () => {
    const freezer = await freezerWith([
      { quantity: 2, frozenOn: older },
      { quantity: 2, frozenOn: today },
    ]);
    try {
      const results = await Promise.all([
        take(first, freezer),
        take(second, freezer),
        take(first, freezer),
      ]);
      expect(results.filter((result) => !result.error)).toHaveLength(3);
      const entries = await entriesIn(freezer);
      // Two from the old registration, then one from today's.
      expect(entries).toHaveLength(1);
      expect(entries[0].frozenOn).toBe(today);
      expect(entries[0].quantity).toBe(1);
    } finally {
      await deleteFreezer(admin, freezer);
    }
  }, 60000);

  it("never loses an update when minus and edit collide", async () => {
    const freezer = await freezerWith([
      { quantity: 2, frozenOn: older },
      { quantity: 1, frozenOn: today },
    ]);
    try {
      const before = await entriesIn(freezer);
      const oldest = before.find((entry) => entry.frozenOn === older)!;
      const newest = before.find((entry) => entry.frozenOn === today)!;
      const [taken, edited] = await Promise.all([
        take(first, freezer),
        second.rpc("app_edit_item", {
          p_freezer: freezer,
          p_name_key: "kjøttdeig",
          p_unit: "pakker",
          p_name: "Kjøttdeig",
          p_new_unit: "pakker",
          p_entries: [
            {
              id: oldest.id,
              quantity: 3,
              frozenOn: oldest.frozenOn,
              expectedVersion: oldest.version,
            },
            {
              id: newest.id,
              quantity: 1,
              frozenOn: newest.frozenOn,
              expectedVersion: newest.version,
            },
          ],
          p_request: randomUUID(),
        }),
      ]);
      expect(taken.error).toBeNull();

      const after = await entriesIn(freezer);
      expect(after.every((entry) => entry.quantity > 0)).toBe(true);
      const oldestAfter = after.find((entry) => entry.frozenOn === older)!.quantity;
      if (edited.error) {
        // Minus won the lock; the edit refused rather than overwriting it.
        expect(edited.error.message).toContain("endret siden");
        expect(oldestAfter).toBe(1);
      } else {
        // Edit won; minus then took one from the corrected quantity.
        expect(oldestAfter).toBe(2);
      }
    } finally {
      await deleteFreezer(admin, freezer);
    }
  }, 60000);

  it("applies a repeated request id once, from either session", async () => {
    const freezer = await freezerWith([{ quantity: 2, frozenOn: older }]);
    try {
      const requestId = randomUUID();
      const call = (client: SupabaseClient) =>
        client.rpc("app_take_one", {
          p_freezer: freezer,
          p_name_key: "kjøttdeig",
          p_unit: "pakker",
          p_request: requestId,
        });
      const results = await Promise.all([call(first), call(second)]);
      expect(results.filter((result) => result.error)).toHaveLength(0);
      const entries = await entriesIn(freezer);
      expect(entries).toHaveLength(1);
      expect(entries[0].quantity).toBe(1);

      const again = await call(first);
      expect((again.data as Mutation).message).toBe((results[0].data as Mutation).message);
      expect((await entriesIn(freezer))[0].quantity).toBe(1);
    } finally {
      await deleteFreezer(admin, freezer);
    }
  }, 60000);

  it("undoes once when both sessions press undo", async () => {
    const freezer = await freezerWith([{ quantity: 2, frozenOn: older }]);
    try {
      const taken = (await take(first, freezer)).data as Mutation;
      const receipt = taken.undo!.id;
      const both = await Promise.all([
        first.rpc("app_undo", { p_receipt: receipt }),
        second.rpc("app_undo", { p_receipt: receipt }),
      ]);
      expect(both.filter((result) => result.error)).toHaveLength(0);
      const entries = await entriesIn(freezer);
      expect(entries).toHaveLength(1);
      expect(entries[0].quantity).toBe(2);
      expect((both[0].data as Mutation).message).toBe((both[1].data as Mutation).message);
    } finally {
      await deleteFreezer(admin, freezer);
    }
  }, 60000);

  it("refuses an undo once the same entry has moved on", async () => {
    const freezer = await freezerWith([{ quantity: 3, frozenOn: older }]);
    try {
      const taken = (await take(first, freezer)).data as Mutation;
      await take(second, freezer);
      const { error } = await first.rpc("app_undo", { p_receipt: taken.undo!.id });
      expect(error?.message).toContain("nyere endring");
      expect((await entriesIn(freezer))[0].quantity).toBe(1);
    } finally {
      await deleteFreezer(admin, freezer);
    }
  }, 60000);
});

if (!hasDatabase()) {
  console.warn(`concurrency: hoppet over. ${skipReason}`);
}
