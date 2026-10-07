import { randomUUID } from "node:crypto";
import pg from "pg";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Shared setup for the tests that need a real database.
 *
 * They are skipped, loudly, when the project is not configured, so that
 * `npm test` stays useful without credentials. `npm run test:db` is the run
 * that actually proves the database behaves.
 */

let loaded = false;
export function loadTestEnv(): void {
  if (loaded) return;
  loaded = true;
  for (const file of [".env.local", ".env"]) {
    try {
      (process as unknown as { loadEnvFile: (path: string) => void }).loadEnvFile(file);
    } catch {
      // Not configured here; hasDatabase() reports it.
    }
  }
}

function env(name: string): string | null {
  loadTestEnv();
  const value = process.env[name]?.trim();
  return value && value.length > 0 ? value : null;
}

export const dbUrl = () => env("SUPABASE_DB_URL");
export const projectUrl = () => env("NEXT_PUBLIC_SUPABASE_URL");
export const anonKey = () => env("NEXT_PUBLIC_SUPABASE_ANON_KEY");
export const serviceKey = () => env("SUPABASE_SERVICE_ROLE_KEY");

export function hasDatabase(): boolean {
  return Boolean(dbUrl() && projectUrl() && anonKey() && serviceKey());
}

export const skipReason =
  "Krever Supabase. Kopier .env.example til .env.local og fyll inn verdiene.";

export function pgClient(): pg.Client {
  return new pg.Client({
    connectionString: dbUrl()!,
    ssl: { rejectUnauthorized: false },
    application_name: "fryseboksen-tests",
  });
}

export async function withPg<T>(body: (client: pg.Client) => Promise<T>): Promise<T> {
  const client = pgClient();
  await client.connect();
  try {
    return await body(client);
  } finally {
    await client.end();
  }
}

/**
 * Runs SQL the way PostgREST would for a signed-in person: the `authenticated`
 * role, with the user id in the JWT claims that auth.uid() reads.
 */
export async function asUser<T>(
  client: pg.Client,
  userId: string,
  body: (client: pg.Client) => Promise<T>,
): Promise<T> {
  await client.query("begin");
  try {
    await client.query("select set_config('request.jwt.claims', $1, true)", [
      JSON.stringify({ sub: userId, role: "authenticated" }),
    ]);
    await client.query("set local role authenticated");
    return await body(client);
  } finally {
    await client.query("rollback");
  }
}

export function adminClient(): SupabaseClient {
  return createClient(projectUrl()!, serviceKey()!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export interface TestUser {
  id: string;
  email: string;
  password: string;
}

export async function createTestUser(label: string): Promise<TestUser> {
  const email = `fryseboksen-${label}-${randomUUID()}@example.com`;
  const password = `${randomUUID()}Aa1!`;
  const { data, error } = await adminClient().auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  if (error || !data.user) {
    throw new Error(
      `Kunne ikke opprette testbruker: ${error?.message ?? "ukjent feil"}. ` +
        "E-post/passord-pålogging må være slått på i Supabase-prosjektet for at testene skal kunne logge inn.",
    );
  }
  return { id: data.user.id, email, password };
}

export async function deleteTestUser(id: string): Promise<void> {
  await adminClient().auth.admin.deleteUser(id);
}

/** A client carrying that person's session, exactly as the browser would. */
export async function signIn(user: TestUser): Promise<SupabaseClient> {
  const client = createClient(projectUrl()!, anonKey()!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { error } = await client.auth.signInWithPassword({
    email: user.email,
    password: user.password,
  });
  if (error) throw new Error(`Kunne ikke logge inn testbrukeren: ${error.message}`);
  return client;
}

/** Test-only. The product has one freezer per person; the contract needs two. */
export async function createFreezer(
  client: pg.Client,
  ownerId: string,
  name: string,
): Promise<string> {
  const { rows } = await client.query<{ id: string }>(
    "insert into public.freezers (owner_id, name) values ($1, $2) returning id",
    [ownerId, name],
  );
  return rows[0].id;
}

export async function deleteFreezer(client: pg.Client, id: string): Promise<void> {
  await client.query("delete from public.freezers where id = $1", [id]);
}

export async function osloToday(client: pg.Client): Promise<string> {
  const { rows } = await client.query<{ today: string }>(
    "select to_char(public.oslo_today(), 'YYYY-MM-DD') as today",
  );
  return rows[0].today;
}
