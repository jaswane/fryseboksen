-- Text normalization shared with the TypeScript domain.
--
-- src/features/inventory/domain.ts groups an item by freezer, normalized name
-- and unit. If the database normalizes differently from the browser, the same
-- item silently splits into two rows or two items silently merge. So the rule
-- is spelled out here instead of leaning on locale-dependent defaults:
--
--   cleanName(v) = v.normalize("NFKC").trim().replace(/\s+/g, " ")
--   normalizeName(v) = cleanName(v).toLocaleLowerCase("nb-NO")
--
-- Two things would otherwise drift:
--
--   1. Postgres [[:space:]] is not JavaScript's \s. NFKC folds most exotic
--      spaces to U+0020, but U+1680, U+2028, U+2029 and U+FEFF survive it.
--      The character class below is JavaScript's \s written out in full.
--   2. lower() follows the database collation. "und-x-icu" pins it to the
--      Unicode default case conversion, which is what toLowerCase() does.
--      Norwegian has no special casing rules, so the "nb-NO" locale argument
--      in the browser makes no difference to the result.
--
-- supabase/tests and src/features/inventory/normalization-parity.test.ts check
-- this against the real database rather than trusting the reasoning above.

create or replace function public.inventory_clean_name(p_name text)
returns text
language sql
immutable
strict
parallel safe
set search_path = ''
as $$
  select btrim(
    regexp_replace(
      normalize(p_name, nfkc),
      E'[\t\n\f\r    -     　﻿]+',
      ' ',
      'g'
    ),
    ' '
  )
$$;

comment on function public.inventory_clean_name(text) is
  'Mirrors cleanName() in src/features/inventory/domain.ts.';

create or replace function public.inventory_name_key(p_name text)
returns text
language sql
immutable
strict
parallel safe
set search_path = ''
as $$
  select lower(public.inventory_clean_name(p_name) collate "und-x-icu")
$$;

comment on function public.inventory_name_key(text) is
  'Mirrors normalizeName() in src/features/inventory/domain.ts.';

-- The user's day, which decides the freezing date that plus records.
-- Every stored instant stays UTC; only this one value is local.
create or replace function public.oslo_today()
returns date
language sql
stable
parallel safe
set search_path = ''
as $$
  select (now() at time zone 'Europe/Oslo')::date
$$;
