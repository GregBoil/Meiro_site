-- Identity lookup for MFA setup only; never use this function to authorize data access.
create or replace function public.meiro_is_admin_account()
returns boolean language sql stable security definer set search_path = ''
as $$
  select exists(select 1 from public.admin_profiles where id = auth.uid() and active = true);
$$;
revoke all on function public.meiro_is_admin_account() from public, anon;
grant execute on function public.meiro_is_admin_account() to authenticated;
