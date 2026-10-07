import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type pg from "pg";
import { cleanName, normalizeName } from "./domain";
import { hasDatabase, pgClient, skipReason } from "../../../tests/support/supabase";

/**
 * The one piece of logic that exists twice: once in the browser, once in
 * Postgres. If they disagree, one item silently becomes two rows, or two items
 * silently become one. Reasoning about the SQL is not enough — this compares
 * the two implementations character by character against the real database.
 */
const CASES: string[] = [
  // Everyday Norwegian
  "Kjøttdeig",
  "KJØTTDEIG",
  "kjøttdeig",
  "  Kjøttdeig  ",
  "Blåbær",
  "BLÅBÆR",
  "Ærfugl",
  "Øl",
  "Rå   laks",
  "Lasagne",
  // Combining marks that NFKC composes
  "Å",
  "Kjöttdeig",
  "Ångström",
  // Compatibility characters NFKC folds
  "ﬁskekaker",
  "Ⅷ",
  "ＫＪＯＴＴ",
  "① pakke",
  // Whitespace that JavaScript's \s covers and [[:space:]] may not
  "kjøtt deig",
  "kjøtt deig",
  "kjøtt deig",
  "kjøtt deig",
  "kjøtt　deig",
  "kjøtt deig",
  "kjøtt deig",
  "kjøtt deig",
  "kjøtt﻿deig",
  "kjøtt\t\ndeig",
  "kjøtt\r\n  deig",
  "kjøttdeig",
  "kjøtt\fdeig",
  "  Kjøttdeig \t",
  "﻿Kjøttdeig﻿",
  "  　 Laks   ",
  // Case mapping corners
  "ẞ",
  "ß",
  "İstanbul",
  "Istanbul",
  "GRØT",
  // Things that must stay distinct
  "kjott",
  "kjøtt-deig",
  "kjøttdeig 2",
];

const suite = hasDatabase() ? describe : describe.skip;

suite("normalization parity between the browser and Postgres", () => {
  let client: pg.Client;

  beforeAll(async () => {
    client = pgClient();
    await client.connect();
  }, 30000);

  afterAll(async () => {
    await client?.end();
  });

  it("has the ICU collation the key depends on", async () => {
    const { rows } = await client.query<{ ok: boolean }>(
      "select exists (select 1 from pg_collation where collname = 'und-x-icu') as ok",
    );
    expect(
      rows[0].ok,
      'Databasen mangler ICU-kollasjonen "und-x-icu". Da kan ikke lower() garantere samme ' +
        "resultat som JavaScript, og normaliseringsmodellen må velges på nytt.",
    ).toBe(true);
  });

  it("produces the same item key for every case", async () => {
    const { rows } = await client.query<{ input: string; key: string; clean: string }>(
      `select value as input,
              public.inventory_name_key(value) as key,
              public.inventory_clean_name(value) as clean
         from unnest($1::text[]) as value`,
      [CASES],
    );
    const mismatches = rows
      .map((row) => ({
        input: JSON.stringify(row.input),
        sqlKey: row.key,
        jsKey: normalizeName(row.input),
        sqlClean: row.clean,
        jsClean: cleanName(row.input),
      }))
      .filter((row) => row.sqlKey !== row.jsKey || row.sqlClean !== row.jsClean);

    expect(mismatches, JSON.stringify(mismatches, null, 2)).toEqual([]);
    expect(rows).toHaveLength(CASES.length);
  });

  it("keeps distinct names distinct", async () => {
    const { rows } = await client.query<{ key: string }>(
      "select public.inventory_name_key(value) as key from unnest($1::text[]) as value",
      [["kjøttdeig", "kjottdeig", "kjøtt-deig", "kjøttdeig 2"]],
    );
    expect(new Set(rows.map((row) => row.key)).size).toBe(4);
  });
});

if (!hasDatabase()) {
  console.warn(`normalization-parity: hoppet over. ${skipReason}`);
}
