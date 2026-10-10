-- Apply after 003, first to staging. No sample accounts or credentials.
begin;
alter table public.user_access add column deletion_pending boolean not null default false;
alter table public.user_access add constraint pending_user_disabled check (not deletion_pending or not active);

-- Same verified identity/domain checks; additionally accept verified invite sessions.
create or replace function public.is_unnes_user()
returns boolean language sql stable security definer set search_path = '' as $$
  select public.has_verified_unnes_identity((select auth.uid()))
    and coalesce((select auth.jwt()) -> 'app_metadata' ->> 'provider', '') in ('google', 'email')
    and exists (select 1 from jsonb_array_elements(coalesce((select auth.jwt()) -> 'amr', '[]'::jsonb)) a
      where a ->> 'method' in ('oauth', 'password', 'recovery', 'invite'));
$$;

create or replace function public.access_token_unnes(event jsonb)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
begin
  if coalesce(event ->> 'authentication_method', '') not in ('oauth', 'password', 'recovery', 'invite', 'token_refresh')
    or coalesce(event -> 'claims' -> 'app_metadata' ->> 'provider', '') not in ('google', 'email')
    or not public.has_verified_unnes_identity((event ->> 'user_id')::uuid)
    or not exists (select 1 from public.user_access a where a.id = (event ->> 'user_id')::uuid and a.active and not a.deletion_pending) then
    return jsonb_build_object('error', jsonb_build_object('http_code', 403, 'message', 'Akun UNNES tidak aktif atau belum terverifikasi.'));
  end if;
  return jsonb_build_object('claims', event -> 'claims');
end;
$$;

-- Return signature changes require recreating this RPC; no table data is dropped.
drop function public.admin_list_users();
create function public.admin_list_users()
returns table(id uuid, name text, email text, role text, active boolean, confirmed boolean, deletion_pending boolean)
language plpgsql security definer set search_path = '' as $$
begin
  if public.current_access_role() is distinct from 'ADMIN' then raise exception 'FORBIDDEN'; end if;
  return query select u.id, coalesce(u.raw_user_meta_data ->> 'full_name', ''), u.email::text,
    a.role, a.active, u.email_confirmed_at is not null, a.deletion_pending
    from auth.users u join public.user_access a on a.id = u.id order by lower(u.email);
end;
$$;

-- Serialize administration before checking caller privileges. This prevents two
-- administrators concurrently disabling/demoting each other and leaving no admin.
create function public.admin_change_access(target_id uuid, new_role text default null,
  new_active boolean default null, prepare_delete boolean default false)
returns void language plpgsql security definer set search_path = '' as $$
declare target public.user_access%rowtype;
begin
  perform pg_catalog.pg_advisory_xact_lock(781204);
  if public.current_access_role() is distinct from 'ADMIN' then raise exception 'FORBIDDEN'; end if;
  if target_id = auth.uid() then raise exception 'SELF_PROTECTED'; end if;
  if new_role is not null and new_role not in ('VIEWER', 'ADMIN') then raise exception 'INVALID_ROLE'; end if;
  select * into target from public.user_access where id = target_id for update;
  if not found then raise exception 'USER_UNAVAILABLE'; end if;
  if target.deletion_pending and not prepare_delete then raise exception 'DELETION_PENDING'; end if;
  if target.role = 'ADMIN' and target.active and public.has_verified_unnes_identity(target.id) and (new_role = 'VIEWER' or new_active = false or prepare_delete) then
    if (select count(*) from public.user_access a where a.role = 'ADMIN' and a.active
      and public.has_verified_unnes_identity(a.id)) <= 1 then raise exception 'LAST_ADMIN'; end if;
  end if;
  update public.user_access set role = coalesce(new_role, role),
    active = case when prepare_delete then false else coalesce(new_active, active) end,
    deletion_pending = deletion_pending or prepare_delete where id = target_id;
end;
$$;
revoke all on function public.admin_change_access(uuid,text,boolean,boolean) from public, anon, authenticated;

create or replace function public.admin_set_role(target_id uuid, new_role text)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if new_role is null then raise exception 'INVALID_ROLE'; end if;
  perform public.admin_change_access(target_id, new_role, null, false);
end;
$$;
create function public.admin_set_active(target_id uuid, new_active boolean)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if new_active is null then raise exception 'INVALID_STATUS'; end if;
  perform public.admin_change_access(target_id, null, new_active, false);
end;
$$;
create function public.admin_prepare_delete(target_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
begin
  perform public.admin_change_access(target_id, null, null, true);
end;
$$;

revoke all on function public.admin_list_users(), public.admin_set_role(uuid,text),
  public.admin_set_active(uuid,boolean), public.admin_prepare_delete(uuid) from public, anon;
grant execute on function public.admin_list_users(), public.admin_set_role(uuid,text),
  public.admin_set_active(uuid,boolean), public.admin_prepare_delete(uuid) to authenticated;
-- Preserve restricted auth-hook execution and existing user_access RLS/no browser writes.
revoke all on function public.is_unnes_user() from public, anon;
grant execute on function public.is_unnes_user() to authenticated;
revoke all on function public.access_token_unnes(jsonb) from public, anon, authenticated;
grant execute on function public.access_token_unnes(jsonb) to supabase_auth_admin;
commit;
