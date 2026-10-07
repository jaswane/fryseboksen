-- Deleting an account.
--
-- The cascades from auth.users would already remove everything. This function
-- exists anyway, and the server calls it before deleting the account, because
-- it is where the rule will have to change: once a freezer can have members,
-- one person leaving must not take a shared freezer with them. Putting the
-- decision here now means that change is one function, not an archaeology
-- exercise across the codebase.

create or replace function public.app_delete_account()
returns void
language plpgsql
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
  -- Today every freezer has exactly one owner, so the freezers go with it.
  delete from public.freezers where owner_id = v_actor;
  delete from public.command_receipts where actor_id = v_actor;
  delete from public.undo_receipts where actor_id = v_actor;
  delete from public.profiles where id = v_actor;
end;
$$;

revoke all on function public.app_delete_account() from public;
grant execute on function public.app_delete_account() to authenticated;
