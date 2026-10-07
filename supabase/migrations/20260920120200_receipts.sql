-- Receipts: two different retry problems, two different tables.

-- What "Angre" reverses. Server issued, single use, bound to the person who
-- made the change. The browser only ever holds the opaque id.
create table if not exists public.undo_receipts (
  id uuid primary key default gen_random_uuid(),
  freezer_id uuid not null references public.freezers (id) on delete cascade,
  actor_id uuid not null references auth.users (id) on delete cascade,
  label text not null,
  -- { before: [entry], after: [entry], freezerBefore, freezerAfter }
  patch jsonb not null,
  created_at timestamptz not null default now(),
  consumed_at timestamptz,
  undo_result jsonb
);

create index if not exists undo_receipts_actor_idx
  on public.undo_receipts (actor_id, freezer_id, created_at desc);

-- Plus and minus are not idempotent on their own, so a lost response must not
-- become a second unit. One user action carries one request id; repeating it
-- repeats the answer and nothing else.
--
-- The primary key is (actor_id, request_id), not request_id alone. That is
-- deliberate: if someone sends another person's request id they simply get
-- their own row. There is no collision to observe and no stored answer of
-- anyone else's to return.
create table if not exists public.command_receipts (
  actor_id uuid not null references auth.users (id) on delete cascade,
  request_id uuid not null,
  freezer_id uuid not null references public.freezers (id) on delete cascade,
  command_type text not null,
  result jsonb not null,
  created_at timestamptz not null default now(),
  primary key (actor_id, request_id)
);

create index if not exists command_receipts_age_idx
  on public.command_receipts (created_at);
