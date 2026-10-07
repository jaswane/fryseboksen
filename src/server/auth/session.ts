import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/client";

export interface SessionUser {
  id: string;
  email: string;
}

/**
 * The data access layer.
 *
 * getUser() rather than getSession(): the session cookie is something the
 * browser hands us, while getUser() has the Auth server confirm the token. The
 * proxy redirect is a convenience for people; this is the check that counts on
 * the server, and row level security is the one that counts in the database.
 *
 * cache() keeps it to one round trip per render pass.
 */
export const getUser = cache(async (): Promise<SessionUser | null> => {
  // Without credentials nobody can be signed in. Reporting that plainly keeps
  // the rest of the site working; signing in is what stops being available,
  // and the login form says so when it is used.
  if (!isSupabaseConfigured()) return null;
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) return null;
  return { id: data.user.id, email: data.user.email ?? "" };
});

export async function requireUser(): Promise<SessionUser> {
  const user = await getUser();
  if (!user) redirect("/logg-inn");
  return user;
}

/**
 * The signed-in person's freezer, created on first visit. Safe to call on every
 * load: app_bootstrap() does nothing when the rows already exist.
 */
export async function requireFreezerId(): Promise<string> {
  await requireUser();
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("app_bootstrap");
  if (error || typeof data !== "string") {
    throw new Error("Vi fikk ikke åpnet fryseren din. Prøv igjen om et øyeblikk.");
  }
  return data;
}
