-- Jalankan pada proyek Supabase. Kontrak telemetri awal, perlu disepakati dengan tim IoT.
begin;
create or replace function public.is_unnes_user()
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from auth.users u join auth.identities i on i.user_id = u.id
    where u.id = (select auth.uid())
      and u.email_confirmed_at is not null
      and lower(u.email) ~ '^[^@[:space:]]+@unnes[.]id$'
      and i.provider = 'google'
      and i.identity_data ->> 'email_verified' = 'true'
      and lower(i.identity_data ->> 'email') = lower(u.email)
      and coalesce((select auth.jwt()) -> 'app_metadata' ->> 'provider', '') = 'google'
      and exists (select 1 from jsonb_array_elements(coalesce((select auth.jwt()) -> 'amr', '[]'::jsonb)) a where a ->> 'method' = 'oauth')
  );
$$;
revoke all on function public.is_unnes_user() from public, anon;
grant execute on function public.is_unnes_user() to authenticated;

-- Hook pendaftaran: metadata provider dikelola Auth, bukan raw_user_meta_data.
create or replace function public.before_user_created_unnes(event jsonb)
returns jsonb language plpgsql set search_path = '' as $$
begin
  if coalesce(lower(event -> 'user' ->> 'email') ~ '^[^@[:space:]]+@unnes[.]id$', false)
     and event -> 'user' -> 'app_metadata' ->> 'provider' = 'google' then
    return '{}'::jsonb;
  end if;
  return jsonb_build_object('error', jsonb_build_object('http_code', 403,
    'message', 'Silakan masuk menggunakan akun Google UNNES (@unnes.id).'));
end;
$$;
revoke all on function public.before_user_created_unnes(jsonb) from public, anon, authenticated;
grant usage on schema public to supabase_auth_admin;
grant execute on function public.before_user_created_unnes(jsonb) to supabase_auth_admin;

-- Tolak juga token untuk akun lama/non-Google dan identitas Google belum terverifikasi.
-- SECURITY DEFINER dengan search_path kosong dan hak execute khusus Auth.
create or replace function public.access_token_unnes(event jsonb)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
begin
  if coalesce(event ->> 'authentication_method', '') not in ('oauth', 'token_refresh')
    or not exists (
      select 1 from auth.users u join auth.identities i on i.user_id = u.id
      where u.id = (event ->> 'user_id')::uuid
        and u.email_confirmed_at is not null
        and lower(u.email) ~ '^[^@[:space:]]+@unnes[.]id$'
        and i.provider = 'google'
        and i.identity_data ->> 'email_verified' = 'true'
        and lower(i.identity_data ->> 'email') = lower(u.email)
        and event -> 'claims' -> 'app_metadata' ->> 'provider' = 'google'
        and exists (select 1 from jsonb_array_elements(coalesce(event -> 'claims' -> 'amr', '[]'::jsonb)) a where a ->> 'method' = 'oauth')
    ) then
    return jsonb_build_object('error', jsonb_build_object('http_code', 403,
      'message', 'Silakan masuk menggunakan akun Google UNNES (@unnes.id).'));
  end if;
  return jsonb_build_object('claims', event -> 'claims');
end;
$$;
revoke all on function public.access_token_unnes(jsonb) from public, anon, authenticated;
grant execute on function public.access_token_unnes(jsonb) to supabase_auth_admin;

create table public.wells (
  id uuid primary key default gen_random_uuid(),
  name text not null, area text not null,
  latitude double precision not null check (latitude between -90 and 90),
  longitude double precision not null check (longitude between -180 and 180)
);
create table public.water_readings (
  id bigint generated always as identity primary key,
  well_id uuid not null references public.wells(id),
  measured_at timestamptz not null,
  interval_start timestamptz not null,
  flow_lpm numeric check (flow_lpm >= 0),
  volume_liters numeric not null check (volume_liters >= 0),
  received_at timestamptz not null default now(),
  check (interval_start < measured_at),
  unique (well_id, measured_at)
);
create index water_readings_time_idx on public.water_readings (measured_at);
alter table public.wells enable row level security;
alter table public.water_readings enable row level security;
revoke all on public.wells, public.water_readings from anon, authenticated;
grant select on public.wells, public.water_readings to authenticated;
create policy unnes_read_wells on public.wells for select to authenticated using ((select public.is_unnes_user()));
create policy unnes_read_water on public.water_readings for select to authenticated using ((select public.is_unnes_user()));
-- Tidak ada policy tulis untuk browser. Ingest melalui backend tepercaya.
commit;
