-- The commands.
--
-- Everything that changes inventory lives here rather than in Next.js, so the
-- rules hold for any client: the web app today, a native app later, and any
-- retry in between. The messages are the ones the interface already shows, in
-- Norwegian, raised with an FB* sqlstate so the adapter knows which errors are
-- safe to show a person and which are not.
--
-- Every mutation takes one advisory lock on the freezer. A freezer belongs to
-- one household, so serializing per freezer costs nothing in practice, and it
-- removes the interleavings that a row lock alone does not: two minus commands
-- racing for the same oldest entry, a minus landing between an edit's version
-- check and its update, or two undos consuming one receipt.

-- Shape helpers ---------------------------------------------------------------

create or replace function public.entry_json(p_lot public.inventory_lots)
returns jsonb
language sql
stable
parallel safe
set search_path = ''
as $$
  select jsonb_build_object(
    'id', p_lot.id,
    'freezerId', p_lot.freezer_id,
    'name', p_lot.name,
    'unit', p_lot.unit,
    'quantity', p_lot.quantity,
    'frozenOn', to_char(p_lot.frozen_on, 'YYYY-MM-DD'),
    'createdAt', to_char(p_lot.created_at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),
    'updatedAt', to_char(p_lot.updated_at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),
    'version', p_lot.version
  )
$$;

-- What a patch stores. created_by is carried so an undo restores the row whole,
-- but it stays out of entry_json so the comparison matches what a snapshot says.
create or replace function public.lot_patch_json(p_lot public.inventory_lots)
returns jsonb
language sql
stable
parallel safe
set search_path = ''
as $$
  select jsonb_build_object('entry', public.entry_json(p_lot), 'createdBy', p_lot.created_by)
$$;

create or replace function public.freezer_patch_json(p_freezer public.freezers)
returns jsonb
language sql
stable
parallel safe
set search_path = ''
as $$
  select jsonb_build_object('id', p_freezer.id, 'name', p_freezer.name, 'version', p_freezer.version)
$$;

-- Reads -----------------------------------------------------------------------

create or replace function public.app_snapshot(p_freezer uuid)
returns jsonb
language plpgsql
stable
set search_path = ''
as $$
declare
  v_freezer jsonb;
begin
  select jsonb_build_object('id', f.id, 'name', f.name)
    into v_freezer
    from public.freezers f
   where f.id = p_freezer;
  if v_freezer is null then
    raise exception 'Fant ikke fryseren.' using errcode = 'FB404';
  end if;
  return jsonb_build_object(
    'freezer', v_freezer,
    'entries', coalesce(
      (select jsonb_agg(public.entry_json(l) order by l.frozen_on, l.created_at, l.id)
         from public.inventory_lots l
        where l.freezer_id = p_freezer),
      '[]'::jsonb)
  );
end;
$$;

create or replace function public.app_list_freezers()
returns jsonb
language sql
stable
set search_path = ''
as $$
  select coalesce(
    jsonb_agg(jsonb_build_object('id', f.id, 'name', f.name) order by f.created_at, f.id),
    '[]'::jsonb)
  from public.freezers f
$$;

-- First visit. Idempotent, so it is safe to call on every page load.
create or replace function public.app_bootstrap()
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid := auth.uid();
  v_freezer uuid;
begin
  if v_actor is null then
    raise exception 'Du er ikke logget inn. Logg inn på nytt og prøv igjen.'
      using errcode = 'FB401';
  end if;
  insert into public.profiles (id) values (v_actor) on conflict (id) do nothing;
  select f.id into v_freezer
    from public.freezers f
   where f.owner_id = v_actor
   order by f.created_at, f.id
   limit 1;
  if v_freezer is null then
    insert into public.freezers (owner_id, name) values (v_actor, 'Min fryser')
    returning id into v_freezer;
  end if;
  return v_freezer;
end;
$$;

-- Validation ------------------------------------------------------------------

create or replace function public.app_validate_entry(
  p_name text,
  p_quantity numeric,
  p_frozen_on text,
  p_unit text,
  p_min_quantity integer
)
returns date
language plpgsql
stable
set search_path = ''
as $$
declare
  v_clean text := public.inventory_clean_name(coalesce(p_name, ''));
  v_date date;
begin
  if char_length(v_clean) < 1 or char_length(v_clean) > 80 then
    raise exception 'Skriv et varenavn på mellom 1 og 80 tegn.' using errcode = 'FB422';
  end if;
  if p_quantity is null
     or p_quantity <> trunc(p_quantity)
     or p_quantity < p_min_quantity
     or p_quantity > 999 then
    raise exception 'Antall må være et helt tall mellom % og 999.', p_min_quantity
      using errcode = 'FB422';
  end if;
  if p_unit is null or p_unit not in ('stk', 'pakker', 'porsjoner') then
    raise exception 'Velg en gyldig enhet.' using errcode = 'FB422';
  end if;
  if p_frozen_on !~ '^\d{4}-\d{2}-\d{2}$' then
    raise exception 'Velg en gyldig innfrysingsdato som ikke er i fremtiden.'
      using errcode = 'FB422';
  end if;
  begin
    v_date := p_frozen_on::date;
  exception when others then
    raise exception 'Velg en gyldig innfrysingsdato som ikke er i fremtiden.'
      using errcode = 'FB422';
  end;
  -- The calendar has to agree too: 2026-02-31 casts on some settings.
  if to_char(v_date, 'YYYY-MM-DD') <> p_frozen_on
     or v_date > public.oslo_today()
     or v_date < date '1900-01-01' then
    raise exception 'Velg en gyldig innfrysingsdato som ikke er i fremtiden.'
      using errcode = 'FB422';
  end if;
  return v_date;
end;
$$;

-- Retry handling --------------------------------------------------------------

create or replace function public.app_replay(
  p_actor uuid,
  p_request uuid,
  p_freezer uuid,
  p_type text
)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_row public.command_receipts%rowtype;
begin
  if p_request is null then
    raise exception 'Forespørselen mangler en identitet. Last siden på nytt og prøv igjen.'
      using errcode = 'FB422';
  end if;
  -- Scoped to the caller. Someone else's request id is simply not found here,
  -- so no stored answer of theirs can be returned or inferred.
  select * into v_row
    from public.command_receipts
   where actor_id = p_actor and request_id = p_request;
  if not found then
    return null;
  end if;
  if v_row.freezer_id <> p_freezer or v_row.command_type <> p_type then
    raise exception 'Forespørselen kan ikke gjentas. Last siden på nytt og prøv igjen.'
      using errcode = 'FB409';
  end if;
  return v_row.result;
end;
$$;

create or replace function public.app_lock_freezer(p_freezer uuid)
returns void
language sql
set search_path = ''
as $$
  select pg_advisory_xact_lock(hashtextextended('fryseboksen:freezer:' || p_freezer::text, 0))
$$;

create or replace function public.app_commit(
  p_actor uuid,
  p_request uuid,
  p_freezer uuid,
  p_type text,
  p_message text,
  p_before jsonb,
  p_after jsonb,
  p_freezer_before jsonb,
  p_freezer_after jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_receipt uuid;
  v_result jsonb;
begin
  insert into public.undo_receipts (freezer_id, actor_id, label, patch)
  values (
    p_freezer,
    p_actor,
    p_message,
    jsonb_build_object(
      'freezerId', p_freezer,
      'before', p_before,
      'after', p_after,
      'freezerBefore', p_freezer_before,
      'freezerAfter', p_freezer_after
    )
  )
  returning id into v_receipt;

  -- Undo is the last action, not a permanent history.
  delete from public.undo_receipts r
   where r.freezer_id = p_freezer
     and (r.created_at < now() - interval '24 hours'
          or r.id not in (
            select id from public.undo_receipts
             where freezer_id = p_freezer
             order by created_at desc
             limit 30));

  v_result := jsonb_build_object(
    'snapshot', public.app_snapshot(p_freezer),
    'message', p_message,
    'undo', jsonb_build_object('id', v_receipt, 'label', p_message)
  );

  insert into public.command_receipts (actor_id, request_id, freezer_id, command_type, result)
  values (p_actor, p_request, p_freezer, p_type, v_result);

  delete from public.command_receipts
   where actor_id = p_actor and created_at < now() - interval '24 hours';

  return v_result;
end;
$$;

-- Commands --------------------------------------------------------------------

create or replace function public.app_add_lot(
  p_freezer uuid,
  p_name text,
  p_quantity numeric,
  p_unit text,
  p_frozen_on text,
  p_request uuid
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid := public.app_require_write(p_freezer);
  v_replay jsonb := public.app_replay(v_actor, p_request, p_freezer, 'add');
  v_date date;
  v_clean text;
  v_lot public.inventory_lots%rowtype;
begin
  if v_replay is not null then return v_replay; end if;
  v_date := public.app_validate_entry(p_name, p_quantity, p_frozen_on, p_unit, 1);
  v_clean := public.inventory_clean_name(p_name);
  perform public.app_lock_freezer(p_freezer);
  insert into public.inventory_lots (freezer_id, name, unit, quantity, frozen_on, created_by)
  values (p_freezer, v_clean, p_unit, p_quantity::integer, v_date, v_actor)
  returning * into v_lot;
  return public.app_commit(
    v_actor, p_request, p_freezer, 'add',
    v_clean || ' er lagt til.',
    '[]'::jsonb, jsonb_build_array(public.lot_patch_json(v_lot)), null, null);
end;
$$;

-- Plus always records a new registration dated today. It never increments an
-- existing one, because the freezing date is the point of the whole product.
create or replace function public.app_add_one(
  p_freezer uuid,
  p_name_key text,
  p_unit text,
  p_request uuid
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid := public.app_require_write(p_freezer);
  v_replay jsonb := public.app_replay(v_actor, p_request, p_freezer, 'add-one');
  v_existing public.inventory_lots%rowtype;
  v_lot public.inventory_lots%rowtype;
begin
  if v_replay is not null then return v_replay; end if;
  perform public.app_lock_freezer(p_freezer);
  select * into v_existing
    from public.inventory_lots
   where freezer_id = p_freezer and name_key = p_name_key and unit = p_unit
   order by frozen_on, created_at, id
   limit 1;
  if not found then
    raise exception 'Varen finnes ikke lenger. Oppdater oversikten og prøv igjen.'
      using errcode = 'FB404';
  end if;
  insert into public.inventory_lots (freezer_id, name, unit, quantity, frozen_on, created_by)
  values (p_freezer, v_existing.name, v_existing.unit, 1, public.oslo_today(), v_actor)
  returning * into v_lot;
  return public.app_commit(
    v_actor, p_request, p_freezer, 'add-one',
    v_existing.name || ': én lagt inn i dag.',
    '[]'::jsonb, jsonb_build_array(public.lot_patch_json(v_lot)), null, null);
end;
$$;

-- Minus takes one unit from the oldest registration: frozen_on, then
-- created_at, then id. The advisory lock above makes that deterministic even
-- when two sessions press minus at the same moment.
create or replace function public.app_take_one(
  p_freezer uuid,
  p_name_key text,
  p_unit text,
  p_request uuid
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid := public.app_require_write(p_freezer);
  v_replay jsonb := public.app_replay(v_actor, p_request, p_freezer, 'take-one');
  v_lot public.inventory_lots%rowtype;
  v_before jsonb;
  v_after jsonb;
  v_name text;
begin
  if v_replay is not null then return v_replay; end if;
  perform public.app_lock_freezer(p_freezer);
  select * into v_lot
    from public.inventory_lots
   where freezer_id = p_freezer and name_key = p_name_key and unit = p_unit
   order by frozen_on, created_at, id
   limit 1
   for update;
  if not found then
    raise exception 'Varen finnes ikke lenger. Oppdater oversikten og prøv igjen.'
      using errcode = 'FB404';
  end if;
  v_before := jsonb_build_array(public.lot_patch_json(v_lot));
  v_name := v_lot.name;
  if v_lot.quantity = 1 then
    delete from public.inventory_lots where id = v_lot.id;
    v_after := '[]'::jsonb;
  else
    update public.inventory_lots
       set quantity = quantity - 1, updated_at = now(), version = version + 1
     where id = v_lot.id
    returning * into v_lot;
    v_after := jsonb_build_array(public.lot_patch_json(v_lot));
  end if;
  return public.app_commit(
    v_actor, p_request, p_freezer, 'take-one',
    v_name || ': én tatt ut fra eldste innlegging.',
    v_before, v_after, null, null);
end;
$$;

-- Edit corrects what is already registered. created_at is kept, so a correction
-- never shows up as a new addition and never lifts the item in "Nylig lagt til".
create or replace function public.app_edit_item(
  p_freezer uuid,
  p_name_key text,
  p_unit text,
  p_name text,
  p_new_unit text,
  p_entries jsonb,
  p_request uuid
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid := public.app_require_write(p_freezer);
  v_replay jsonb := public.app_replay(v_actor, p_request, p_freezer, 'edit');
  v_clean text;
  v_current integer;
  v_correction jsonb;
  v_lot public.inventory_lots%rowtype;
  v_updated public.inventory_lots%rowtype;
  v_date date;
  v_quantity numeric;
  v_before jsonb := '[]'::jsonb;
  v_after jsonb := '[]'::jsonb;
  v_ids uuid[] := '{}';
  v_stale constant text := 'Varen er endret siden du åpnet den. Lukk og åpne Rediger igjen.';
begin
  if v_replay is not null then return v_replay; end if;
  perform public.app_lock_freezer(p_freezer);

  select count(*) into v_current
    from public.inventory_lots
   where freezer_id = p_freezer and name_key = p_name_key and unit = p_unit;
  if v_current = 0 then
    raise exception 'Varen finnes ikke lenger. Oppdater oversikten og prøv igjen.'
      using errcode = 'FB404';
  end if;
  if jsonb_typeof(p_entries) <> 'array' or jsonb_array_length(p_entries) <> v_current then
    raise exception '%', v_stale using errcode = 'FB409';
  end if;

  v_clean := public.inventory_clean_name(p_name);

  for v_correction in select * from jsonb_array_elements(p_entries) loop
    if not (v_correction ? 'id') then
      raise exception '%', v_stale using errcode = 'FB409';
    end if;
    if (v_correction ->> 'id')::uuid = any (v_ids) then
      raise exception '%', v_stale using errcode = 'FB409';
    end if;
    v_ids := v_ids || (v_correction ->> 'id')::uuid;

    select * into v_lot
      from public.inventory_lots
     where id = (v_correction ->> 'id')::uuid
       and freezer_id = p_freezer
       and name_key = p_name_key
       and unit = p_unit
     for update;
    if not found or v_lot.version <> (v_correction ->> 'expectedVersion')::integer then
      raise exception '%', v_stale using errcode = 'FB409';
    end if;

    -- Zero is how the interface removes a mistaken registration. It is checked
    -- as a quantity, then applied as a delete, because a stored zero would be
    -- a state the product does not have. This check comes first so an invalid
    -- quantity reports the range the edit dialog actually allows.
    begin
      v_quantity := (v_correction ->> 'quantity')::numeric;
    exception when others then
      v_quantity := null;
    end;
    if v_quantity is null or v_quantity <> trunc(v_quantity)
       or v_quantity < 0 or v_quantity > 999 then
      raise exception 'Antall må være et helt tall mellom 0 og 999.' using errcode = 'FB422';
    end if;
    v_date := public.app_validate_entry(
      p_name, greatest(v_quantity, 1), v_correction ->> 'frozenOn', p_new_unit, 1);

    if v_quantity = 0 then
      v_before := v_before || jsonb_build_array(public.lot_patch_json(v_lot));
      delete from public.inventory_lots where id = v_lot.id;
    elsif v_lot.name <> v_clean
       or v_lot.unit <> p_new_unit
       or v_lot.quantity <> v_quantity::integer
       or v_lot.frozen_on <> v_date then
      v_before := v_before || jsonb_build_array(public.lot_patch_json(v_lot));
      update public.inventory_lots
         set name = v_clean,
             unit = p_new_unit,
             quantity = v_quantity::integer,
             frozen_on = v_date,
             updated_at = now(),
             version = version + 1
       where id = v_lot.id
      returning * into v_updated;
      v_after := v_after || jsonb_build_array(public.lot_patch_json(v_updated));
    end if;
  end loop;

  return public.app_commit(
    v_actor, p_request, p_freezer, 'edit',
    v_clean || ' er korrigert.',
    v_before, v_after, null, null);
end;
$$;

create or replace function public.app_delete_item(
  p_freezer uuid,
  p_name_key text,
  p_unit text,
  p_request uuid
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid := public.app_require_write(p_freezer);
  v_replay jsonb := public.app_replay(v_actor, p_request, p_freezer, 'delete');
  v_before jsonb;
  v_name text;
begin
  if v_replay is not null then return v_replay; end if;
  perform public.app_lock_freezer(p_freezer);
  select coalesce(jsonb_agg(public.lot_patch_json(l) order by l.frozen_on, l.created_at, l.id),
                  '[]'::jsonb),
         min(l.name)
    into v_before, v_name
    from public.inventory_lots l
   where l.freezer_id = p_freezer and l.name_key = p_name_key and l.unit = p_unit;
  if v_name is null then
    raise exception 'Varen finnes ikke lenger. Oppdater oversikten og prøv igjen.'
      using errcode = 'FB404';
  end if;
  delete from public.inventory_lots
   where freezer_id = p_freezer and name_key = p_name_key and unit = p_unit;
  return public.app_commit(
    v_actor, p_request, p_freezer, 'delete',
    v_name || ' er slettet.',
    v_before, '[]'::jsonb, null, null);
end;
$$;

create or replace function public.app_rename_freezer(
  p_freezer uuid,
  p_name text,
  p_request uuid
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid := public.app_require_write(p_freezer);
  v_replay jsonb := public.app_replay(v_actor, p_request, p_freezer, 'rename-freezer');
  v_clean text;
  v_before public.freezers%rowtype;
  v_after public.freezers%rowtype;
begin
  if v_replay is not null then return v_replay; end if;
  v_clean := public.inventory_clean_name(coalesce(p_name, ''));
  if char_length(v_clean) < 1 or char_length(v_clean) > 60 then
    raise exception 'Frysernavnet må ha mellom 1 og 60 tegn.' using errcode = 'FB422';
  end if;
  perform public.app_lock_freezer(p_freezer);
  select * into v_before from public.freezers where id = p_freezer for update;
  update public.freezers
     set name = v_clean, updated_at = now(), version = version + 1
   where id = p_freezer
  returning * into v_after;
  return public.app_commit(
    v_actor, p_request, p_freezer, 'rename-freezer',
    'Frysernavnet er endret.',
    '[]'::jsonb, '[]'::jsonb,
    public.freezer_patch_json(v_before), public.freezer_patch_json(v_after));
end;
$$;

-- Undo reverses one specific action with the original dates. It refuses when
-- anything it touched has moved on, rather than quietly overwriting it.
create or replace function public.app_undo(p_receipt uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid := auth.uid();
  v_receipt public.undo_receipts%rowtype;
  v_patch jsonb;
  v_item jsonb;
  v_entry jsonb;
  v_current jsonb;
  v_expected jsonb;
  v_freezer public.freezers%rowtype;
  v_ids uuid[] := '{}';
  v_id uuid;
  v_result jsonb;
begin
  if v_actor is null then
    raise exception 'Du er ikke logget inn. Logg inn på nytt og prøv igjen.'
      using errcode = 'FB401';
  end if;
  select * into v_receipt
    from public.undo_receipts
   where id = p_receipt and actor_id = v_actor;
  if not found then
    raise exception 'Denne endringen kan ikke angres lenger.' using errcode = 'FB404';
  end if;
  perform public.app_require_write(v_receipt.freezer_id);
  perform public.app_lock_freezer(v_receipt.freezer_id);

  -- Re-read behind the lock: a second undo of the same receipt must replay the
  -- first answer, not run again.
  select * into v_receipt from public.undo_receipts where id = p_receipt for update;
  if v_receipt.consumed_at is not null then
    return v_receipt.undo_result;
  end if;

  v_patch := v_receipt.patch;

  for v_item in select * from jsonb_array_elements(v_patch -> 'after') loop
    v_ids := v_ids || ((v_item -> 'entry' ->> 'id')::uuid);
  end loop;
  for v_item in select * from jsonb_array_elements(v_patch -> 'before') loop
    if not ((v_item -> 'entry' ->> 'id')::uuid = any (v_ids)) then
      v_ids := v_ids || ((v_item -> 'entry' ->> 'id')::uuid);
    end if;
  end loop;

  -- Every affected row must still look exactly as this action left it.
  -- Absent on both sides counts as a match: that is a row this action deleted
  -- and nobody has recreated.
  foreach v_id in array v_ids loop
    v_current := null;
    v_expected := null;
    select public.entry_json(l) into v_current
      from public.inventory_lots l
     where l.id = v_id;
    select (a -> 'entry') into v_expected
      from jsonb_array_elements(v_patch -> 'after') as a
     where (a -> 'entry' ->> 'id')::uuid = v_id;
    if v_current is distinct from v_expected then
      raise exception 'Varen er endret igjen. Angre ville overskrevet en nyere endring.'
        using errcode = 'FB409';
    end if;
  end loop;

  if coalesce(v_patch -> 'freezerAfter', 'null'::jsonb) <> 'null'::jsonb then
    select * into v_freezer from public.freezers where id = v_receipt.freezer_id for update;
    if public.freezer_patch_json(v_freezer) is distinct from (v_patch -> 'freezerAfter') then
      raise exception 'Frysernavnet er endret igjen. Den eldre endringen kan ikke angres.'
        using errcode = 'FB409';
    end if;
  end if;

  delete from public.inventory_lots where id = any (v_ids);

  for v_item in select * from jsonb_array_elements(v_patch -> 'before') loop
    v_entry := v_item -> 'entry';
    insert into public.inventory_lots
      (id, freezer_id, name, unit, quantity, frozen_on, created_at, updated_at, version, created_by)
    values (
      (v_entry ->> 'id')::uuid,
      (v_entry ->> 'freezerId')::uuid,
      v_entry ->> 'name',
      v_entry ->> 'unit',
      (v_entry ->> 'quantity')::integer,
      (v_entry ->> 'frozenOn')::date,
      (v_entry ->> 'createdAt')::timestamptz,
      (v_entry ->> 'updatedAt')::timestamptz,
      (v_entry ->> 'version')::integer,
      nullif(v_item ->> 'createdBy', '')::uuid
    );
  end loop;

  if coalesce(v_patch -> 'freezerBefore', 'null'::jsonb) <> 'null'::jsonb then
    update public.freezers
       set name = v_patch -> 'freezerBefore' ->> 'name',
           version = (v_patch -> 'freezerBefore' ->> 'version')::integer,
           updated_at = now()
     where id = v_receipt.freezer_id;
  end if;

  v_result := jsonb_build_object(
    'snapshot', public.app_snapshot(v_receipt.freezer_id),
    'message', 'Endringen er angret.',
    'undo', null
  );

  update public.undo_receipts
     set consumed_at = now(), undo_result = v_result
   where id = p_receipt;

  return v_result;
end;
$$;

-- Grants ----------------------------------------------------------------------

revoke all on function public.entry_json(public.inventory_lots) from public;
revoke all on function public.lot_patch_json(public.inventory_lots) from public;
revoke all on function public.freezer_patch_json(public.freezers) from public;
revoke all on function public.app_validate_entry(text, numeric, text, text, integer) from public;
revoke all on function public.app_replay(uuid, uuid, uuid, text) from public;
revoke all on function public.app_lock_freezer(uuid) from public;
revoke all on function public.app_commit(uuid, uuid, uuid, text, text, jsonb, jsonb, jsonb, jsonb) from public;

revoke all on function public.app_snapshot(uuid) from public;
revoke all on function public.app_list_freezers() from public;
revoke all on function public.app_bootstrap() from public;
revoke all on function public.app_add_lot(uuid, text, numeric, text, text, uuid) from public;
revoke all on function public.app_add_one(uuid, text, text, uuid) from public;
revoke all on function public.app_take_one(uuid, text, text, uuid) from public;
revoke all on function public.app_edit_item(uuid, text, text, text, text, jsonb, uuid) from public;
revoke all on function public.app_delete_item(uuid, text, text, uuid) from public;
revoke all on function public.app_rename_freezer(uuid, text, uuid) from public;
revoke all on function public.app_undo(uuid) from public;

grant execute on function public.app_snapshot(uuid) to authenticated;
grant execute on function public.app_list_freezers() to authenticated;
grant execute on function public.app_bootstrap() to authenticated;
grant execute on function public.app_add_lot(uuid, text, numeric, text, text, uuid) to authenticated;
grant execute on function public.app_add_one(uuid, text, text, uuid) to authenticated;
grant execute on function public.app_take_one(uuid, text, text, uuid) to authenticated;
grant execute on function public.app_edit_item(uuid, text, text, text, text, jsonb, uuid) to authenticated;
grant execute on function public.app_delete_item(uuid, text, text, uuid) to authenticated;
grant execute on function public.app_rename_freezer(uuid, text, uuid) to authenticated;
grant execute on function public.app_undo(uuid) to authenticated;
