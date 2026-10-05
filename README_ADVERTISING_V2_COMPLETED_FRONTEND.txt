TENOTEMO ADVERTISING V2 COMPLETED FRONTEND — 05 OCT 2026

Built on the user-confirmed working Earn Freeze Fix baseline.

Admin Advertising V2 changes:
- Business accounts are the primary advertiser identity, independent of the Tenotemo account that captured them.
- Admin can create a business account for an advertiser who is not a player.
- Admin can open one business at a time and see granted / used / available credits.
- Admin can create a business-owned campaign application.
- Admin verifies cleared payment and approves/releases the application with an approved Advertising Credit allocation.
- No editable Rand campaign budget exists in the V2 flow.
- Historical corrections use the audited credit-adjustment RPC installed earlier.
- Legacy poster/payment/package admin controls are hidden to prevent mixed-account publishing.
- The legacy one-step launch wizard is removed from the Admin UI.
- Existing published-campaign management is preserved.
- Existing player proof review and payout administration are preserved.
- WhatsApp Status / Facebook Story / Instagram Story compliance notice remains in the player flow.
- No MutationObserver was added; the confirmed Earn freeze fix remains intact.

Backend RPCs used (already created during the V2 migration):
- tenotemo_admin_advertising_businesses()
- tenotemo_admin_create_advertiser_business(...)
- tenotemo_admin_create_advertising_application(...)
- tenotemo_admin_approve_advertising_application(...)
- tenotemo_admin_adjust_advertising_credits(...)

No new SQL is included or required for this frontend package beyond the V2 RPCs already installed.
