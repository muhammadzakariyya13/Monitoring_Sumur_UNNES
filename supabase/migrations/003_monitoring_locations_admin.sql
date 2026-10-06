-- LOCAL REVIEW ARTIFACT ONLY. Apply manually to staging after backup/review.
-- This file does not define or implement an IoT payload/ingestion endpoint.
begin;
alter table public.wells rename to monitoring_locations;
alter table public.monitoring_locations add column type text not null default 'WELL' check (type in ('WELL','BUILDING'));
alter table public.monitoring_locations add column code text;
update public.monitoring_locations set code = 'SMR-' || id::text;
alter table public.monitoring_locations alter column code set not null;
alter table public.monitoring_locations add unique (code);
alter table public.monitoring_locations add column active boolean not null default true;
alter table public.monitoring_locations add column occupants integer check (occupants >= 0);
alter table public.monitoring_locations add constraint well_no_occupants check (type = 'BUILDING' or occupants is null);
alter table public.water_readings rename column well_id to location_id;
create table public.user_access (
  id uuid primary key references auth.users(id) on delete cascade,
  role text not null default 'VIEWER' check (role in ('VIEWER','ADMIN')),
  active boolean not null default true
);
alter table public.user_access enable row level security;
revoke all on public.user_access from anon, authenticated;
insert into public.user_access(id) select id from auth.users where lower(email) ~ '^[^@[:space:]]+@unnes[.]id$' on conflict do nothing;
create function public.register_user_access() returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.user_access(id) values (new.id) on conflict do nothing;
  return new;
end;
$$;
revoke all on function public.register_user_access() from public;
create trigger register_user_access after insert on auth.users for each row execute function public.register_user_access();
create function public.current_access_role() returns text language sql stable security definer set search_path = '' as $$
  select role from public.user_access where id = (select auth.uid()) and active and public.is_unnes_user();
$$;
revoke all on function public.current_access_role() from public, anon;
grant execute on function public.current_access_role() to authenticated;
drop policy unnes_read_wells on public.monitoring_locations;
drop policy unnes_read_water on public.water_readings;
create policy monitoring_read on public.monitoring_locations for select to authenticated using ((select public.current_access_role()) is not null);
create policy readings_read on public.water_readings for select to authenticated using ((select public.current_access_role()) is not null);
grant insert, update on public.monitoring_locations to authenticated;
create policy monitoring_insert on public.monitoring_locations for insert to authenticated with check ((select public.current_access_role()) = 'ADMIN');
create policy monitoring_update on public.monitoring_locations for update to authenticated using ((select public.current_access_role()) = 'ADMIN') with check ((select public.current_access_role()) = 'ADMIN');
create function public.admin_list_users() returns table(id uuid, name text, email text, role text, active boolean)
language plpgsql security definer set search_path = '' as $$
begin
  if public.current_access_role() is distinct from 'ADMIN' then raise exception 'Forbidden'; end if;
  return query select u.id, coalesce(u.raw_user_meta_data ->> 'full_name',''), u.email::text, a.role, a.active from auth.users u join public.user_access a on a.id=u.id order by u.email;
end;
$$;
create function public.admin_set_role(target_id uuid, new_role text) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if public.current_access_role() is distinct from 'ADMIN' or target_id = auth.uid() then raise exception 'Forbidden'; end if;
  if new_role not in ('VIEWER','ADMIN') then raise exception 'Invalid role'; end if;
  update public.user_access set role = new_role where id = target_id and active;
  if not found then raise exception 'User not available'; end if;
end;
$$;
revoke all on function public.admin_list_users(), public.admin_set_role(uuid,text) from public, anon;
grant execute on function public.admin_list_users(), public.admin_set_role(uuid,text) to authenticated;
commit;
