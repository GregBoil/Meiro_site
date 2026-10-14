# Security hardening status

## Step 2: RPC permissions

Applied to the shared Meiro Supabase project: `20261013113845_restrict_admin_rpc_execution.sql`.

All seven `admin_*` functions now deny EXECUTE to PUBLIC/anon. Authenticated callers retain EXECUTE, with the unchanged `is_meiro_admin()` check inside every function. `create_variant_inventory()` is a trigger, not an application RPC; its public/client EXECUTE grants were removed. Public catalogue helpers were not restricted.

Verified against the real database, inside transactions rolled back afterward:
- Anonymous invocation of each of the seven admin functions fails with insufficient privilege.
- Customer invocation of each fails with Unauthorized.
- An existing admin can call the reference-change function with the existing reference; it returns successfully without changing data.
- Function definition hashes before/after match for all seven functions.

## Password configuration — saved by the user

The available Supabase connector does not expose read/update Auth configuration. The user reported saving the password settings on 2026-10-14. Their exact values have not been independently verified through the connector.

In the Meiro project dashboard, open Authentication > Sign In / Providers > Email. Set Minimum password length to 12. Enable leaked password protection if the option is available (Supabase documents Pro plan or above). Save and check the saved values. Do not paste credentials or passwords into chat.

The frontend already asks for 12 characters for signup/password changes. That validation does not replace Supabase Auth enforcement. Verify a short password is rejected by Supabase during a controlled test when account registration is enabled. SMTP/domain setup remains pending; do not enable new email-dependent options that the application cannot yet handle.

## Step 1: MFA still pending

Only one of two admins was enrolled at the last check. The strict `require_admin_mfa` migration must remain unapplied until the other admin enrolls. Apply this RPC-permission migration individually rather than blindly pushing all pending migrations. See admin-mfa.md for the MFA rollout.

## Step 3: account carts and dashboard stock

Cart storage is now per account (`meiro.cart.v2.<userId>`). The provider remounts on account changes, preventing previous-user items from rendering or being saved to the next user's key. Guests and authentication-loading states expose an empty cart. Only storage events for the active account (or a storage clear) are handled. The legacy shared cart is not imported. Browser storage remains local and is not encrypted; this is account separation in the application, not protection against someone with access to browser storage or scripts running on the same origin.

The dashboard reads `availability` and counts only `sold_out` and `low_stock`; `available`, `made_to_order` and unknown statuses are not counted as out of stock.

Verification: account persistence/isolation unit test, 20 passing automated tests, Pages build, and DOM checks for account switch/logout/relogin, auth loading, no cross-account writes, active-account tab sync, unrelated-account event isolation and mixed dashboard statuses.
