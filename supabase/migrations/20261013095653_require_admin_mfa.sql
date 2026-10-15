-- Apply only after all active admins have enrolled verified TOTP factors.
-- MFA enrollment remains accessible through meiro_is_admin_account.
do $$
begin
  if not exists(select 1 from public.admin_profiles where active)
    or exists(select 1 from public.admin_profiles a where a.active and not exists(
      select 1 from auth.mfa_factors f where f.user_id = a.id and f.factor_type = 'totp' and f.status = 'verified'
    )) then
    raise exception 'Enroll TOTP for every active admin before enforcing MFA';
  end if;
end $$;
create or replace function public.is_meiro_admin()
returns boolean language sql stable security definer set search_path = ''
as $$
  select coalesce(auth.jwt()->>'aal' = 'aal2', false)
    and exists(select 1 from public.admin_profiles where id = auth.uid() and active = true);
$$;
