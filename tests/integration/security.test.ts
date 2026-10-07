import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type pg from "pg";
import type { SupabaseClient } from "@supabase/supabase-js";
import { randomUUID } from "node:crypto";
import {
  asUser,
  createTestUser,
  deleteTestUser,
  hasDatabase,
  osloToday,
  pgClient,
  projectUrl,
  anonKey,
  signIn,
  skipReason,
  type TestUser,
} from "../support/supabase";
import { createClient } from "@supabase/supabase-js";

/**
 * Two people, one database. Everything here is an attempt to reach across that
 * line, from the outside and from inside a session.
 */
const suite = hasDatabase() ? describe : describe.skip;

suite("access boundaries", () => {
  let admin: pg.Client;
  let alice: TestUser;
  let bob: TestUser;
  let aliceClient: SupabaseClient;
  let bobClient: SupabaseClient;
  let aliceFreezer: string;
  let bobFreezer: string;
  let today: string;

  const request = () => randomUUID();

  beforeAll(async () => {
    admin = pgClient();
    await admin.connect();
    today = await osloToday(admin);
    alice = await createTestUser("alice");
    bob = await createTestUser("bob");
    aliceClient = await signIn(alice);
    bobClient = await signIn(bob);
    aliceFreezer = (await aliceClient.rpc("app_bootstrap")).data as string;
    bobFreezer = (await bobClient.rpc("app_bootstrap")).data as string;
    await aliceClient.rpc("app_add_lot", {
      p_freezer: aliceFreezer,
      p_name: "Kjøttdeig",
      p_quantity: 2,
      p_unit: "pakker",
      p_frozen_on: today,
      p_request: request(),
    });
  }, 90000);

  afterAll(async () => {
    await aliceClient?.auth.signOut();
    await bobClient?.auth.signOut();
    if (alice) await deleteTestUser(alice.id);
    if (bob) await deleteTestUser(bob.id);
    await admin?.end();
  }, 90000);

  it("gives each person their own freezer", () => {
    expect(aliceFreezer).toBeTruthy();
    expect(bobFreezer).toBeTruthy();
    expect(aliceFreezer).not.toBe(bobFreezer);
  });

  it("hides another person's freezer and contents from a direct read", async () => {
    const freezers = await bobClient.from("freezers").select("id");
    expect(freezers.error).toBeNull();
    expect(freezers.data?.map((row) => row.id)).toEqual([bobFreezer]);

    const lots = await bobClient.from("inventory_lots").select("id, name");
    expect(lots.error).toBeNull();
    expect(lots.data).toEqual([]);
  });

  it("refuses to describe a freezer that is not yours", async () => {
    const { error } = await bobClient.rpc("app_snapshot", { p_freezer: aliceFreezer });
    expect(error?.message).toContain("Fant ikke fryseren");
  });

  it("refuses a command aimed at a forged freezer id", async () => {
    for (const [fn, args] of [
      [
        "app_add_lot",
        {
          p_name: "Smuglet laks",
          p_quantity: 1,
          p_unit: "stk",
          p_frozen_on: today,
        },
      ],
      ["app_add_one", { p_name_key: "kjøttdeig", p_unit: "pakker" }],
      ["app_take_one", { p_name_key: "kjøttdeig", p_unit: "pakker" }],
      ["app_delete_item", { p_name_key: "kjøttdeig", p_unit: "pakker" }],
      ["app_rename_freezer", { p_name: "Min nå" }],
    ] as const) {
      const { error } = await bobClient.rpc(fn, {
        ...args,
        p_freezer: aliceFreezer,
        p_request: request(),
      });
      expect(error?.message, fn).toContain("Fant ikke fryseren");
    }
    const after = await aliceClient.rpc("app_snapshot", { p_freezer: aliceFreezer });
    const snapshot = after.data as { freezer: { name: string }; entries: unknown[] };
    expect(snapshot.entries).toHaveLength(1);
  });

  it("refuses to undo someone else's change", async () => {
    const added = await aliceClient.rpc("app_add_lot", {
      p_freezer: aliceFreezer,
      p_name: "Erter",
      p_quantity: 1,
      p_unit: "pakker",
      p_frozen_on: today,
      p_request: request(),
    });
    const receipt = (added.data as { undo: { id: string } }).undo.id;
    const { error } = await bobClient.rpc("app_undo", { p_receipt: receipt });
    expect(error?.message).toContain("kan ikke angres");

    const still = await aliceClient.rpc("app_snapshot", { p_freezer: aliceFreezer });
    const entries = (still.data as { entries: { name: string }[] }).entries;
    expect(entries.some((entry) => entry.name === "Erter")).toBe(true);
  });

  it("cannot read another person's undo receipts", async () => {
    const { data, error } = await bobClient.from("undo_receipts").select("id, label");
    expect(error).toBeNull();
    expect(data).toEqual([]);
  });

  /**
   * The point of the composite primary key on command_receipts. Bob reusing
   * Alice's request id must not hand him her answer, and must not disturb hers.
   */
  it("never returns one person's stored answer to another", async () => {
    const shared = randomUUID();
    const mine = await aliceClient.rpc("app_add_lot", {
      p_freezer: aliceFreezer,
      p_name: "Hemmelig kake",
      p_quantity: 1,
      p_unit: "stk",
      p_frozen_on: today,
      p_request: shared,
    });
    expect(mine.error).toBeNull();

    // Same request id, Bob's own freezer: he gets his own effect.
    const his = await bobClient.rpc("app_add_lot", {
      p_freezer: bobFreezer,
      p_name: "Brød",
      p_quantity: 1,
      p_unit: "stk",
      p_frozen_on: today,
      p_request: shared,
    });
    expect(his.error).toBeNull();
    const hisSnapshot = his.data as { entries: { name: string }[] };
    expect(hisSnapshot.entries.map((entry) => entry.name)).toEqual(["Brød"]);
    expect(JSON.stringify(his.data)).not.toContain("Hemmelig kake");
    expect(JSON.stringify(his.data)).not.toContain(aliceFreezer);

    // Same request id aimed at her freezer: refused as any other foreign call.
    const stolen = await bobClient.rpc("app_add_lot", {
      p_freezer: aliceFreezer,
      p_name: "Brød",
      p_quantity: 1,
      p_unit: "stk",
      p_frozen_on: today,
      p_request: shared,
    });
    expect(stolen.error?.message).toContain("Fant ikke fryseren");

    // Hers replays unchanged.
    const replay = await aliceClient.rpc("app_add_lot", {
      p_freezer: aliceFreezer,
      p_name: "Hemmelig kake",
      p_quantity: 1,
      p_unit: "stk",
      p_frozen_on: today,
      p_request: shared,
    });
    expect(replay.data).toEqual(mine.data);
  });

  it("refuses a replay that points at a different command", async () => {
    const shared = randomUUID();
    await aliceClient.rpc("app_add_lot", {
      p_freezer: aliceFreezer,
      p_name: "Vafler",
      p_quantity: 1,
      p_unit: "stk",
      p_frozen_on: today,
      p_request: shared,
    });
    const { error } = await aliceClient.rpc("app_take_one", {
      p_freezer: aliceFreezer,
      p_name_key: "vafler",
      p_unit: "stk",
      p_request: shared,
    });
    expect(error?.message).toContain("kan ikke gjentas");
  });

  it("does not let a session write inventory directly", async () => {
    await asUser(admin, alice.id, async (client) => {
      for (const statement of [
        `insert into public.inventory_lots (freezer_id, name, unit, quantity, frozen_on)
           values ('${aliceFreezer}', 'Snik', 'stk', 1, current_date)`,
        `update public.inventory_lots set quantity = 99 where freezer_id = '${aliceFreezer}'`,
        `delete from public.inventory_lots where freezer_id = '${aliceFreezer}'`,
        `update public.freezers set name = 'Kapret' where id = '${aliceFreezer}'`,
        `insert into public.freezers (owner_id, name) values ('${alice.id}', 'Ekstra')`,
      ]) {
        await expect(client.query(statement), statement).rejects.toThrow(/permission denied/i);
      }
    });
  });

  it("does not expose the replay log to a session", async () => {
    await asUser(admin, alice.id, async (client) => {
      await expect(client.query("select * from public.command_receipts")).rejects.toThrow(
        /permission denied/i,
      );
    });
  });

  it("shows a signed-out visitor nothing", async () => {
    const anon = createClient(projectUrl()!, anonKey()!, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const read = await anon.from("inventory_lots").select("id");
    expect(read.data ?? []).toEqual([]);
    const write = await anon.rpc("app_add_lot", {
      p_freezer: aliceFreezer,
      p_name: "Uinnlogget",
      p_quantity: 1,
      p_unit: "stk",
      p_frozen_on: today,
      p_request: request(),
    });
    expect(write.error).not.toBeNull();
    const bootstrap = await anon.rpc("app_bootstrap");
    expect(bootstrap.error).not.toBeNull();
  });

  it("validates on the server even when the client does not", async () => {
    for (const [name, quantity, frozenOn, expected] of [
      ["Erter", 0, today, "Antall"],
      ["Erter", 1.5, today, "Antall"],
      ["Erter", 1000, today, "Antall"],
      ["   ", 1, today, "varenavn"],
      ["Erter", 1, "2026-02-31", "dato"],
      ["Erter", 1, "ikke-en-dato", "dato"],
      ["Erter", 1, "1899-12-31", "dato"],
    ] as const) {
      const { error } = await aliceClient.rpc("app_add_lot", {
        p_freezer: aliceFreezer,
        p_name: name,
        p_quantity: quantity,
        p_unit: "stk",
        p_frozen_on: frozenOn,
        p_request: request(),
      });
      expect(error?.message, `${name} ${quantity} ${frozenOn}`).toContain(expected);
    }
  });

  it("refuses a freezing date that is in the future in Oslo", async () => {
    const tomorrow = new Date(today + "T12:00:00Z");
    tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
    const { error } = await aliceClient.rpc("app_add_lot", {
      p_freezer: aliceFreezer,
      p_name: "Erter",
      p_quantity: 1,
      p_unit: "stk",
      p_frozen_on: tomorrow.toISOString().slice(0, 10),
      p_request: request(),
    });
    expect(error?.message).toContain("dato");
  });

  it("removes every trace of an account when it is deleted", async () => {
    const leaving = await createTestUser("leaving");
    const client = await signIn(leaving);
    const freezer = (await client.rpc("app_bootstrap")).data as string;
    await client.rpc("app_add_lot", {
      p_freezer: freezer,
      p_name: "Rester",
      p_quantity: 1,
      p_unit: "porsjoner",
      p_frozen_on: today,
      p_request: request(),
    });
    const before = await admin.query("select count(*)::int as n from public.inventory_lots where freezer_id = $1", [freezer]);
    expect(before.rows[0].n).toBe(1);

    const { error } = await client.rpc("app_delete_account");
    expect(error).toBeNull();
    await deleteTestUser(leaving.id);

    for (const [table, column] of [
      ["public.inventory_lots", "freezer_id"],
      ["public.freezers", "id"],
    ] as const) {
      const { rows } = await admin.query(
        `select count(*)::int as n from ${table} where ${column} = $1`,
        [freezer],
      );
      expect(rows[0].n, table).toBe(0);
    }
    for (const table of ["public.profiles", "public.undo_receipts", "public.command_receipts"]) {
      const column = table.endsWith("profiles") ? "id" : "actor_id";
      const { rows } = await admin.query(
        `select count(*)::int as n from ${table} where ${column} = $1`,
        [leaving.id],
      );
      expect(rows[0].n, table).toBe(0);
    }
  }, 60000);
});

if (!hasDatabase()) {
  console.warn(`security: hoppet over. ${skipReason}`);
}
