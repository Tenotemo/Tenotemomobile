TENOTEMO 06 OCT 2026 CONSOLIDATED FIX

1. Run TENOTEMO_2026-10-06_CONSOLIDATED_FIX.sql in Supabase SQL Editor first.
2. After Success, deploy this ZIP to Vercel.

Fixes included:
- Advertising V2 proof of payment is attached to the exact business/application.
- An application cannot be approved without its proof of payment.
- Applications can be reopened from their business workspace for payment proof/approval.
- Advertising Credits debit once when a participant registers a campaign share; duplicate share clicks do not debit twice.
- Share action refreshes provisional earnings immediately.
- Restart My Games resets game rounds but preserves accumulated game points so future points continue toward Memory Credit conversion.
- Existing Story media-only native sharing fix is preserved.

R1 correction: one qualifying share now reserves R1.00 provisional earnings and consumes one Advertising Credit.
