begin;
alter table public.monitoring_locations
  add column daily_usage_limit numeric,
  add column limit_notification_enabled boolean not null default false,
  add constraint building_usage_limit_positive check (
    daily_usage_limit is null or (daily_usage_limit > 0 and daily_usage_limit < 'Infinity'::numeric)
  ),
  add constraint well_no_usage_limit check (
    type = 'BUILDING' or (daily_usage_limit is null and not limit_notification_enabled)
  );
comment on column public.monitoring_locations.daily_usage_limit is
  'Admin-defined daily building usage limit in m3, WIB day; NULL means unset.';
-- Existing monitoring_insert/update RLS (003) requires current_access_role() = ADMIN.
-- No write privileges/policies are added to water_readings; sensor data stays read-only.
commit;
