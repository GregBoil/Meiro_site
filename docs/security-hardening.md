# Security hardening status

## Step 2: RPC permissions

Applied to the shared Meiro Supabase project: `20261013113845_restrict_admin_rpc_execution.sql`.

All seven `admin_*` functions now deny EXECUTE to PUBLIC/anon. Authenticated callers retain EXECUTE, with the unchanged `is_meiro_admin()` check inside every function. `create_variant_inventory()` is a trigger, not an application RPC; its public/client EXECUTE grants were removed. Public catalogue helpers were not restricted.

Verified against the real database, inside transactions rolled back afterward:
- Anonymous invocation of each of the seven admin functions fails with insufficient privilege.
- Customer invocation of each fails with Unauthorized.
- An existing admin can call the reference-change function with the existing reference; it returns successfully without changing data.
- Function definition hashes before/after match for all seven functions.

## Password configuration — dashboard action still required

The available Supabase connector does not expose read/update Auth configuration. The server's current minimum password length has therefore not been verified or changed.

In the Meiro project dashboard, open Authentication > Sign In / Providers > Email. Set Minimum password length to 12. Enable leaked password protection if the option is available (Supabase documents Pro plan or above). Save and check the saved values. Do not paste credentials or passwords into chat.

The frontend already asks for 12 characters for signup/password changes. That validation does not replace Supabase Auth enforcement. Verify a short password is rejected by Supabase during a controlled test when account registration is enabled. SMTP/domain setup remains pending; do not enable new email-dependent options that the application cannot yet handle.

## Step 1: MFA still pending

Only one of two admins was enrolled at the last check. The strict `require_admin_mfa` migration must remain unapplied until the other admin enrolls. Apply this RPC-permission migration individually rather than blindly pushing all pending migrations. See admin-mfa.md for the MFA rollout.
