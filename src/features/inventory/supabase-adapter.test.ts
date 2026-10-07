import { afterAll, beforeAll, describe } from "vitest";
import type pg from "pg";
import type { SupabaseClient } from "@supabase/supabase-js";
import { SupabaseInventoryAdapter } from "./supabase-adapter";
import { describeInventoryContract, type ContractHarness } from "./contract-suite";
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
} from "../../../tests/support/supabase";

/**
 * The same contract suite the local demo adapter passes, run against Postgres.
 * If both pass this file and local-adapter.test.ts, swapping the adapter is a
 * change of composition root and nothing else.
 */
const suite = hasDatabase() ? describe : describe.skip;

suite("inventory contract (Supabase adapter)", () => {
  let admin: pg.Client;
  let user: TestUser;
  let client: SupabaseClient;
  let today: string;

  beforeAll(async () => {
    admin = pgClient();
    await admin.connect();
    user = await createTestUser("contract");
    client = await signIn(user);
    today = await osloToday(admin);
  }, 60000);

  afterAll(async () => {
    await client?.auth.signOut();
    if (user) await deleteTestUser(user.id);
    await admin?.end();
  }, 60000);

  const harness: ContractHarness = {
    async create() {
      // A fresh pair of freezers per test, so the cases stay independent
      // without paying for a new account each time.
      const freezerId = await createFreezer(admin, user.id, "Fryseren hjemme");
      const otherFreezerId = await createFreezer(admin, user.id, "Min fryser");
      return {
        adapter: new SupabaseInventoryAdapter(client),
        freezerId,
        otherFreezerId,
        today,
      };
    },
    async dispose(context) {
      await deleteFreezer(admin, context.freezerId);
      await deleteFreezer(admin, context.otherFreezerId);
    },
  };

  describeInventoryContract(harness);
});

if (!hasDatabase()) {
  console.warn(`supabase-adapter: hoppet over. ${skipReason}`);
}
