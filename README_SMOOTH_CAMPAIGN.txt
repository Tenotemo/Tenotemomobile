TENOTEMO EARN: ONE-STEP CAMPAIGN LAUNCH

1. Run tenotemo_smooth_campaign_admin.sql in Supabase SQL Editor (after prior Tenotemo Earn migrations).
2. Upload index.html, tenotemo-earn.js, tenotemo-spotlight.js, tenotemo-versus.js, and api/r.js to the ROOT of your existing GitHub repository (api/r.js stays inside api).
3. Wait for Vercel deployment, refresh, sign in as admin, open Tenotemo Earn > Advertiser campaign administration.
4. Choose a registered advertiser with an active package, supply advertiser-approved Spotlight text and campaign details, click Approve Spotlight & publish Earn campaign.
5. Confirm campaign appears under Available business & service campaigns. If the account has no profile, it appears as Advertiser account [UUID prefix] if it has a granted package.

No additional payment or package grant is triggered by publishing. The one-step action creates an approved text Spotlight post and a live campaign in one database transaction. Existing Spotlight post manual linkage is under Advanced. Advertiser images can still be posted and approved through existing Spotlight flow and linked using Advanced. No automated cash payout. Keep current deployment for rollback.
