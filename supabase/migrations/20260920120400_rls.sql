-- Row level security, plus a second lock on top of it.
--
-- Layer one: RLS decides what a signed-in session may read.
-- Layer two: inventory writes are revoked outright, so the only way to change
-- a lot is through a command function that validates first. Losing either
-- layer still leaves the other standing.
--
-- Note what is deliberately absent: "force row level security". The command
-- functions are security definer and run as the table owner, which is exactly
-- how they are allowed to write while nobody else can. Forcing RLS on the
-- owner would lock the commands out too.

alter table public.profiles enable row level security;
alter table public.freezers enable row level security;
alter table public.inventory_lots enable row level security;
alter table public.undo_receipts enable row level security;
alter table public.command_receipts enable row level security;

-- profiles ------------------------------------------------------------------
drop policy if exists profiles_select_own on public.profiles;
create policy profiles_select_own on public.profiles
  for select to authenticated
  using (id = auth.uid());

-- No insert, update or delete policy. Rows appear through app_bootstrap()
-- and disappear with the account.

-- freezers ------------------------------------------------------------------
drop policy if exists freezers_select_own on public.freezers;
create policy freezers_select_own on public.freezers
  for select to authenticated
  using (owner_id = auth.uid());

-- inventory_lots ------------------------------------------------------------
drop policy if exists inventory_lots_select_readable on public.inventory_lots;
create policy inventory_lots_select_readable on public.inventory_lots
  for select to authenticated
  using (public.can_read_freezer(freezer_id));

-- undo_receipts -------------------------------------------------------------
drop policy if exists undo_receipts_select_own on public.undo_receipts;
create policy undo_receipts_select_own on public.undo_receipts
  for select to authenticated
  using (actor_id = auth.uid() and public.can_read_freezer(freezer_id));

-- command_receipts ----------------------------------------------------------
-- No policy at all. Replay goes through the command functions, which scope the
-- lookup to the caller. Nothing reads this table directly.

-- Writes are not reachable from a session -----------------------------------
revoke insert, update, delete, truncate on public.profiles from anon, authenticated;
revoke insert, update, delete, truncate on public.freezers from anon, authenticated;
revoke insert, update, delete, truncate on public.inventory_lots from anon, authenticated;
revoke insert, update, delete, truncate on public.undo_receipts from anon, authenticated;
revoke all on public.command_receipts from anon, authenticated;

revoke select on public.profiles from anon;
revoke select on public.freezers from anon;
revoke select on public.inventory_lots from anon;
revoke select on public.undo_receipts from anon;

grant select on public.profiles to authenticated;
grant select on public.freezers to authenticated;
grant select on public.inventory_lots to authenticated;
grant select on public.undo_receipts to authenticated;
