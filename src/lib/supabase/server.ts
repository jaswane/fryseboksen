import "server-only";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import { supabaseEnv } from "./client";

/**
 * A fresh client per request, as @supabase/ssr requires. `cookies()` is async
 * in this version of Next.js.
 *
 * Server Components cannot set cookies once streaming has begun, so a refresh
 * that lands during render is written by proxy.ts instead. The ignored throw
 * below is that case and only that case.
 */
export async function createClient(): Promise<SupabaseClient> {
  // Read cookies first. It marks the route as request-time rendered, so a
  // missing configuration reports itself at runtime instead of turning into a
  // prerender error for a page that was never meant to be static.
  const store = await cookies();
  const { url, key } = supabaseEnv();
  return createServerClient(url, key, {
    cookies: {
      getAll: () => store.getAll(),
      setAll: (list) => {
        try {
          for (const { name, value, options } of list) store.set(name, value, options);
        } catch {
          // Render path: proxy.ts owns the refresh for this request.
        }
      },
    },
  });
}
