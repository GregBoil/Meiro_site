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

## Step 4: media hardening — applied 2026-10-15

Applied individually to the shared Meiro database:
- `20261015072420_harden_media_access.sql`
- `20261015072510_allow_admin_media_storage_listing.sql`

The bucket was already restricted to JPEG, PNG and WebP, maximum 10 MiB. These settings are now versioned. Both upload screens share the same MIME/extension/size/header checks, explicit accepted formats, Mongolian guidance, random UUID paths, and `finally` handling to release their busy state after errors. Invalid files are rejected before creating a product draft. Header checks are client-side feedback, not a server-side byte scanner; bucket MIME/size limits and admin RLS remain the server boundary.

Visitors and customers can query media records only when used by a published product or active homepage slide. Admins retain full library access. The bucket remains public: someone who already knows an image URL can still fetch the image. This restriction hides unused/draft media metadata; it does not make those image bytes confidential. No existing files were deleted.

Product/media foreign keys now reject deleting referenced media instead of cascading deletion into product images. Homepage references already used RESTRICT. Storage restrictive policies prevent deleting or replacing registered files. Remove an unused media record before its file; existing UI cleanup uses that order. Admin-only Storage SELECT permission is explicit, as listing/deletion requires it. Customers cannot list Storage metadata.

Verification:
- 23 automated tests pass, including MIME/extension/signature mismatch, SVG/HTML, empty/oversize files, size boundary, generated paths, media RLS and Storage protection/cleanup.
- GitHub Pages compilation passes.
- Real-database role checks in a rolled-back transaction: published media readable; unused metadata hidden from anon and customers; anonymous insertion denied; admin library and Storage listing readable; deleting referenced media rejected. Test data did not persist.
- No real upload/delete through the Storage HTTP API or signed-in browser visual check is claimed.

The Supabase advisors still report leaked-password protection disabled. Its availability depends on the plan; dashboard configuration remains needed if supported. MFA enrollment remains 1 of 2 active admins. No strict MFA activation was applied.

Next: frontend hardening and browser verification, then review/merge/deploy the account branch. Frontend changes on this branch are not yet deployed on main.
