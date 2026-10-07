#!/usr/bin/env node
// Applies supabase/migrations to the database in SUPABASE_DB_URL.
//
// The Supabase CLI needs Docker, which this machine does not have, so this
// runner talks to the project database directly. It only ever adds: it never
// drops a table, a schema or a row of anyone's data.
//
//   node scripts/db.mjs          apply migrations that have not run yet
//   node scripts/db.mjs --force  run every migration again (all are rerunnable)
//   node scripts/db.mjs --status list what has been applied

import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import pg from "pg";

const MIGRATIONS = path.join(process.cwd(), "supabase", "migrations");

export function loadEnv() {
  for (const file of [".env.local", ".env"]) {
    try {
      process.loadEnvFile(path.join(process.cwd(), file));
    } catch {
      // Missing file is fine; the caller reports what is still unset.
    }
  }
}

export function databaseUrl() {
  loadEnv();
  const url = process.env.SUPABASE_DB_URL?.trim();
  return url && url.length > 0 ? url : null;
}

export function connect(url) {
  return new pg.Client({
    connectionString: url,
    // Supabase terminates TLS with its own chain; verification is off here the
    // same way psql's default sslmode=require is, and no secret is sent before
    // the handshake completes.
    ssl: { rejectUnauthorized: false },
    application_name: "fryseboksen-migrations",
  });
}

async function main() {
  const url = databaseUrl();
  if (!url) {
    console.error(
      "SUPABASE_DB_URL mangler. Kopier .env.example til .env.local og fyll inn verdiene.",
    );
    process.exit(1);
  }
  const force = process.argv.includes("--force");
  const statusOnly = process.argv.includes("--status");
  const client = connect(url);
  await client.connect();
  try {
    await client.query(`
      create table if not exists public.schema_migrations (
        version text primary key,
        applied_at timestamptz not null default now()
      )
    `);
    const { rows } = await client.query("select version from public.schema_migrations");
    const applied = new Set(rows.map((row) => row.version));
    const files = (await readdir(MIGRATIONS)).filter((name) => name.endsWith(".sql")).sort();

    if (statusOnly) {
      for (const file of files) console.log(`${applied.has(file) ? "applied" : "pending"}  ${file}`);
      return;
    }

    let count = 0;
    for (const file of files) {
      if (applied.has(file) && !force) continue;
      const sql = await readFile(path.join(MIGRATIONS, file), "utf8");
      await client.query("begin");
      try {
        await client.query(sql);
        await client.query(
          `insert into public.schema_migrations (version) values ($1)
           on conflict (version) do update set applied_at = now()`,
          [file],
        );
        await client.query("commit");
        console.log(`ok    ${file}`);
        count += 1;
      } catch (error) {
        await client.query("rollback");
        console.error(`FEIL  ${file}`);
        throw error;
      }
    }
    console.log(count === 0 ? "Ingen nye migrasjoner." : `${count} migrasjon(er) kjørt.`);
  } finally {
    await client.end();
  }
}

if (import.meta.url === `file://${process.argv[1].replace(/\\/g, "/")}`) {
  main().catch((error) => {
    console.error(error.message ?? error);
    process.exit(1);
  });
}
