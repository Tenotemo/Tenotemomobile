TENOTEMO ADVERTISING V2 FRONTEND BUILD — 05 OCT 2026

Before deployment:
1. Run tenotemo_advertising_v2_frontend_rpc.sql once in Supabase SQL Editor.
2. Deploy the contents of this ZIP to Vercel in the same way as the current Tenotemo build.

Implemented in this frontend cutover:
- Business-specific Advertising V2 ledger cards in Admin.
- Admin-managed vs self-service business labels.
- Audited historical credit adjustments; balances are not directly overwritten.
- Legacy mixed-account campaign launch wizard is hidden to prevent new misallocated campaigns.
- Old 0.5-credit-per-R1 wording removed from the V2 Admin balance area.
- One V2 Advertising Credit = one approved R1 sponsored publication wording.
- WhatsApp Status, Facebook Story and Instagram Story are the eligible proof choices.
- Sponsored disclosure added to generated share text.
- Compliance notice prohibits rewarded DMs/group spam, bots, purchased/fabricated views and engagement exchanges.
- >2 hours + 21 genuine views are described as eligibility for admin review, not guaranteed approval/purchased views.
- Privacy reminder added to avoid unnecessary viewer names/phone numbers in proof screenshots.
- Exhausted paid campaigns remain clearly identified as 5 Memory Credit mode.

Important:
The legacy launch wizard is deliberately disabled rather than reused because it identifies advertisers by the capturing user account. Publishing must move to the V2 application/business-owned RPC flow before it is re-enabled.
