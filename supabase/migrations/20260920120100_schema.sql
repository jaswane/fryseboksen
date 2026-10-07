-- Core tables.
--
-- Access boundary is the freezer, never the item. freezers.owner_id says who
-- owns it; a later freezer_members table can widen access without moving a
-- single row of inventory. created_by is metadata only: authorization must
-- never depend on who put the food in.

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.profiles is
  'One row per account. Deliberately minimal: no name is collected.';

create table if not exists public.freezers (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  version integer not null default 1,
  constraint freezers_name_length check (char_length(btrim(name)) between 1 and 60),
  constraint freezers_version_positive check (version >= 1)
);

create index if not exists freezers_owner_idx on public.freezers (owner_id, created_at, id);

-- One registration of one item on one freezing date. The interface collects
-- these into a single line per name and unit; the rows keep their own dates.
-- The word "lot" stays out of the interface.
create table if not exists public.inventory_lots (
  id uuid primary key default gen_random_uuid(),
  freezer_id uuid not null references public.freezers (id) on delete cascade,
  name text not null,
  name_key text generated always as (public.inventory_name_key(name)) stored,
  unit text not null,
  quantity integer not null,
  frozen_on date not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  version integer not null default 1,
  created_by uuid references auth.users (id) on delete set null,
  constraint inventory_lots_name_length check (char_length(btrim(name)) between 1 and 80),
  constraint inventory_lots_unit_known check (unit in ('stk', 'pakker', 'porsjoner')),
  -- Zero is a correction in the interface, not a stored state: the command
  -- deletes the row instead. Whole countable units only.
  constraint inventory_lots_quantity_range check (quantity between 1 and 999),
  constraint inventory_lots_frozen_on_range check (frozen_on >= date '1900-01-01'),
  constraint inventory_lots_version_positive check (version >= 1)
);

-- Covers both the oldest-first take and the lookup of one item.
create index if not exists inventory_lots_item_idx
  on public.inventory_lots (freezer_id, name_key, unit, frozen_on, created_at, id);

comment on column public.inventory_lots.created_by is
  'Metadata only. Access is decided by the freezer, never by who added the item.';
