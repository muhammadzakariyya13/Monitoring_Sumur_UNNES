-- Jalankan setelah 001. Policy SELECT dan tabel telemetri dipertahankan.
begin;
create or replace function public.has_verified_unnes_identity(account_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from auth.users u join auth.identities i on i.user_id = u.id
    where u.id = account_id and u.email_confirmed_at is not null
      and lower(u.email) ~ '^[^@[:space:]]+@unnes[.]id$'
      and lower(i.identity_data ->> 'email') = lower(u.email)
      and (i.provider = 'email' or (i.provider = 'google' and i.identity_data ->> 'email_verified' = 'true'))
  );
$$;
revoke all on function public.has_verified_unnes_identity(uuid) from public, anon, authenticated;
create or replace function public.is_unnes_user()
returns boolean language sql stable security definer set search_path = '' as $$
  select public.has_verified_unnes_identity((select auth.uid()))
    and coalesce((select auth.jwt()) -> 'app_metadata' ->> 'provider', '') in ('google', 'email')
    and exists (select 1 from jsonb_array_elements(coalesce((select auth.jwt()) -> 'amr', '[]'::jsonb)) a
      where a ->> 'method' in ('oauth', 'password', 'recovery'));
$$;
revoke all on function public.is_unnes_user() from public, anon;
grant execute on function public.is_unnes_user() to authenticated;
create or replace function public.before_user_created_unnes(event jsonb)
returns jsonb language plpgsql set search_path = '' as $$
begin
  if coalesce(lower(event -> 'user' ->> 'email') ~ '^[^@[:space:]]+@unnes[.]id$', false)
    and event -> 'user' -> 'app_metadata' ->> 'provider' in ('google', 'email') then
    return '{}'::jsonb;
  end if;
  return jsonb_build_object('error', jsonb_build_object('http_code', 403, 'message', 'Gunakan akun UNNES (@unnes.id).'));
end;
$$;
revoke all on function public.before_user_created_unnes(jsonb) from public, anon, authenticated;
grant execute on function public.before_user_created_unnes(jsonb) to supabase_auth_admin;
create or replace function public.access_token_unnes(event jsonb)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
begin
  if coalesce(event ->> 'authentication_method', '') not in ('oauth', 'password', 'recovery', 'token_refresh')
    or coalesce(event -> 'claims' -> 'app_metadata' ->> 'provider', '') not in ('google', 'email')
    or not public.has_verified_unnes_identity((event ->> 'user_id')::uuid) then
    return jsonb_build_object('error', jsonb_build_object('http_code', 403, 'message', 'Gunakan akun UNNES terverifikasi (@unnes.id).'));
  end if;
  return jsonb_build_object('claims', event -> 'claims');
end;
$$;
revoke all on function public.access_token_unnes(jsonb) from public, anon, authenticated;
grant execute on function public.access_token_unnes(jsonb) to supabase_auth_admin;
commit;
