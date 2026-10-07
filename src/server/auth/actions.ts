"use server";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/client";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireUser } from "./session";
import { siteUrl } from "./config";

export interface LoginState {
  error?: string;
}

/**
 * A single-use link by e-mail. No password to choose, forget or reuse, and
 * nothing to store beyond the address itself.
 *
 * The flow is kept behind this one function on purpose: swapping it for a
 * numeric code later changes this file and the confirmation route, and touches
 * nothing in the inventory domain.
 */
export async function sendMagicLink(_state: LoginState, formData: FormData): Promise<LoginState> {
  const email = String(formData.get("email") ?? "")
    .trim()
    .toLowerCase();
  if (email.length < 5 || email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) {
    return { error: "Skriv en gyldig e-postadresse." };
  }
  if (!isSupabaseConfigured()) {
    return { error: "Innlogging er ikke tilgjengelig akkurat nå. Prøv igjen senere." };
  }
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: { emailRedirectTo: siteUrl() + "/auth/bekreft" },
  });
  if (error) {
    // Supabase limits how often it will send. Say so plainly instead of
    // pretending the mail is on its way.
    return {
      error:
        error.status === 429
          ? "Du har bedt om flere lenker på kort tid. Vent noen minutter og prøv igjen."
          : "Vi fikk ikke sendt innloggingslenken. Prøv igjen om et øyeblikk.",
    };
  }
  redirect("/logg-inn/sjekk-e-post");
}

export async function signOut(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/");
}

/**
 * Deletes the person's own data first through their own session, then the
 * account itself. Only the second step needs the service role, and only for
 * that one call.
 */
export async function deleteAccount(): Promise<{ error: string } | void> {
  const user = await requireUser();
  const supabase = await createClient();
  const { error } = await supabase.rpc("app_delete_account");
  if (error) {
    return { error: "Vi fikk ikke slettet dataene dine. Prøv igjen om et øyeblikk." };
  }
  const admin = createAdminClient();
  const removed = await admin.auth.admin.deleteUser(user.id);
  if (removed.error) {
    return {
      error:
        "Fryserinnholdet ditt er slettet, men selve kontoen ble ikke fjernet. Kontakt oss, så rydder vi opp.",
    };
  }
  await supabase.auth.signOut();
  redirect("/");
}
