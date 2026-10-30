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

Frontend hardening is recorded in Step 5 below. Full real-account acceptance checks and review/merge/deployment remain pending. Frontend changes on this branch are not yet deployed on main.

## Step 5: frontend hardening — implemented 2026-10-15

Production builds inject a Content Security Policy before external resources. Scripts are same-origin only (no inline handlers/eval); connections and remote images are limited to the configured Supabase HTTPS origin, plus its WebSocket origin for connections. Google Fonts is explicitly allowed. Data/blob images remain allowed for the MFA QR code. Inline style attributes remain supported for the existing UI. Objects, embedded frames, workers and base tags are blocked. Referrer metadata uses `no-referrer` to avoid forwarding auth query parameters to external resources. Development retains Vite's normal hot reload without a production CSP.

Only the four documented public configuration variables can enter Vite's frontend environment. A build refuses secret/service-role Supabase keys, malformed/incomplete configuration, non-HTTPS Supabase URLs and external contact endpoints. Legacy `anon` keys remain supported. No production credentials are required for CI or preview builds. The four variable names remain unchanged for the Pages deployment workflow.

An application error boundary and startup fallback show Mongolian recovery actions instead of a blank screen or raw error details. This catches rendering/startup failures, not every async event handler. The admin login now prevents duplicate submissions while pending, handles unexpected request errors, clears its password state after submission, and releases the busy state. Existing client account handling already catches request failures.

Direct package versions are pinned to the previously locked versions. `source-map-js` was updated from 1.2.1 to 1.2.2 to fix GHSA-68fv-2mgg-jv7q (build dependency). `npm audit` reports zero known vulnerabilities at this check. A new PR workflow runs dependency audit, tests and Pages compilation without deployment permissions.

Verification:
- 26 automated tests pass; browser and Pages builds compile.
- A configured Pages build used a fake public key and an unrelated `VITE_PRIVATE_SECRET` marker. The marker was absent from the built output.
- Chromium checks on the actual configured Pages build with simulated Supabase/Fonts responses: desktop/mobile pages, no horizontal overflow on the homepage, guest login/contact states, admin invalid-credentials and network-failure retries with password clearing, and mocked MFA enrollment with a decodable SVG data-image QR. No unexpected CSP violations or uncaught page errors.
- Browser enforcement checks reject an injected inline script and an unapproved fetch. A deliberately crashing test component exercises the error boundary and its recovery actions without displaying raw error content. The mobile recovery screen was visually inspected.
- These are local browser checks with simulated services, not successful real-account login/payment/upload tests in production.

Hosting limitations: GitHub Pages does not let this repository set custom response headers. Meta CSP cannot enforce `frame-ancestors`, and no X-Frame-Options/HSTS/custom header protection is claimed. When hosting changes, configure supported response headers at the host. Payments or new third-party integrations will require an explicit review of CSP allowed origins before use.

Remaining rollout: second admin enrollment and strict database MFA, full real-account desktop/mobile acceptance checks, review/merge and deployment. Frontend changes remain on `feat/customer-accounts` until reviewed; no main deployment performed.

References: https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Content-Security-Policy ; https://vite.dev/config/shared-options.html#envprefix ; https://react.dev/reference/react/Component#catching-rendering-errors-with-an-error-boundary ; https://github.com/advisories/GHSA-68fv-2mgg-jv7q

## Customer acceptance checks — 2026-10-30

User-verified on the local branch: guest catalogue/product access, sign-in required for the basket, admin login inaccessible without a session; client cart quantity/pricing/persistence and admin access refusal; separate baskets when switching between two accounts.

Checkout refresh fix: the saved delivery address was fetched, but the form always started at the address-entry step. Address loading now distinguishes a persisted address from profile defaults and restores the review step only for the current account's saved address. A separate preview refresh no longer discards that review state. Users can still edit and save the address. No schema or production customer data changed.

Verification: 27 automated tests and Pages compilation pass. A new regression test covers per-user address save/load, updates, unsaved profile defaults and read failures. Chromium checks against a configured build with simulated services cover save/refresh without resubmitting, delayed preview, editing and refresh, second-account isolation, return to the first account, and read-error retry. Payment stays disabled. Actual-user address refresh and isolation remain to be retested by the user after pulling the fix.

The October 30 CI audit also detected newly reported Vite advisories affecting the pinned 6.4.3 development/build tool. Vite is updated to the patched 6.4.5 release in a separate commit, preserving the existing major version. The lockfile is updated; rerun npm ci after pulling. Address browser regression checks and the complete test/build suite were rerun with this version.

## Primary account address — 2026-10-30

Implemented the separate main-address section in My Information and the main/other delivery selector. Migration `20261030005953_customer_primary_addresses.sql` is applied and checked with real database roles in a rolled-back transaction. Primary addresses are owner-only; an alternative delivery address cannot overwrite the primary address through the application. Existing delivery records remain intact as alternatives. See customer-addresses.md for behavior and validation. The suite now has 28 passing tests.
