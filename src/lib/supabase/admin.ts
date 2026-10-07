import "server-only";
import { createClient } from "@supabase/supabase-js";
import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * The service role bypasses row level security completely. It exists for one
 * job: removing the account itself once the person's own data is gone. Nothing
 * else may import this module, and it must never reach the browser — the
 * "server-only" import above turns a mistake into a build error.
 */
export function createAdminClient(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error("Kontosletting er ikke konfigurert. Sett SUPABASE_SERVICE_ROLE_KEY.");
  }
  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
