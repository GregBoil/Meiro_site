# Admin MFA rollout

The admin UI requires a verified TOTP session (AAL2). QR codes and secrets stay in component memory; never send them to support or commit screenshots of them.

The identity migration is applied to Meiro. `meiro_is_admin_account()` returns only whether the current user is an active admin, allowing MFA setup independently of data authorization. Do not use it in data policies or mutation authorization.

## Enroll both admins

Pull `feat/customer-accounts`, run the site, and open `/admin` (`#/admin` on GitHub Pages). Sign in, connect an authenticator app, scan the QR code, and enter its six-digit code. Repeat for the other admin. Sign out and test signing in again.

## Enforce database protection

`20261013095653_require_admin_mfa.sql` is intentionally not applied yet to the shared project. Its guard rejects activation if any active admin has no verified TOTP factor. Once both admins are enrolled and this UI is available, apply the migration. It replaces `is_meiro_admin()` with active admin identity AND a signed JWT `aal2` check. Existing admin RLS policies, Storage policies and admin RPC checks all depend on this helper. An AAL1 admin can still start MFA but cannot use admin data privileges. Published catalogue data remains public.

Do not merge/deploy the activation migration automatically before enrollment. Test visitor, customer, AAL1 admin and AAL2 admin, including direct API calls. Confirm orders of other customers and draft products are denied at AAL1.

## Lost authenticator

No application bypass or client-side recovery code exists. An authorized Supabase project operator must verify the person's identity independently and remove the lost factor using Supabase's supported administrative tools. The user then enrolls a replacement through the UI. Do not weaken `is_meiro_admin()` or grant admin access to an unverified caller. Enrollment blocks are distinct from password-reset email configuration.
