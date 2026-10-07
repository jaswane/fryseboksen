-- Access helpers.
--
-- Today both answer the same question, and that is on purpose. Reading and
-- writing are separated now so that freezer_members can later grant one
-- without the other, and so the policies on inventory_lots never have to
-- change when it does.
--
-- security definer is what keeps this out of a recursive policy: the helper
-- reads public.freezers without re-entering the policy on public.freezers.

create or replace function public.can_read_freezer(p_freezer uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.freezers f
    where f.id = p_freezer
      and f.owner_id = auth.uid()
  )
$$;

create or replace function public.can_write_freezer(p_freezer uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.freezers f
    where f.id = p_freezer
      and f.owner_id = auth.uid()
  )
$$;

revoke all on function public.can_read_freezer(uuid) from public;
revoke all on function public.can_write_freezer(uuid) from public;
grant execute on function public.can_read_freezer(uuid) to authenticated;
grant execute on function public.can_write_freezer(uuid) to authenticated;

-- The guard every writing command starts with. A freezer that is not yours
-- reads as missing rather than forbidden, so the answer does not confirm that
-- someone else's freezer exists.
create or replace function public.app_require_write(p_freezer uuid)
returns uuid
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_actor uuid := auth.uid();
begin
  if v_actor is null then
    raise exception 'Du er ikke logget inn. Logg inn på nytt og prøv igjen.'
      using errcode = 'FB401';
  end if;
  if not public.can_write_freezer(p_freezer) then
    raise exception 'Fant ikke fryseren.' using errcode = 'FB404';
  end if;
  return v_actor;
end;
$$;

revoke all on function public.app_require_write(uuid) from public;
