TENOTEMO EARN — RICH CAMPAIGN SHARING (builds on Manage Published Campaigns)

Upload index.html, tenotemo-earn.js, tenotemo-spotlight.js, tenotemo-versus.js and the api folder to the ROOT of the existing GitHub repository. In particular, keep BOTH api/c.js and api/r.js. Deploy with Vercel. No additional SQL is required if the previous Manage Published Campaigns and Picture/Video SQL were already applied.

Share Campaign Link: opens a campaign preview page with approved media, title and message. On WhatsApp/Facebook, the link can display an image preview where the platform supports it. Video previews depend on platform; some show only text or a thumbnail. Link preview bots do NOT count as referral visits. A real visitor clicks the advertiser CTA to pass through api/r.js, where indicative visits are recorded.

Share Picture / Video: tries the native file share sheet. Browser/platform may omit the referral link when sharing a file; use Copy Referral Link separately. Unsupported devices download the approved media and copy the message/link. Video is not guaranteed to upload into every app automatically.

REQUIRED VERCEL SERVER ENV VARS (existing referral setup): SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, TENOTEMO_REFERRAL_SALT. Keep service role key and salt SERVER-SIDE ONLY, never in HTML or GitHub.

Note: Supabase media bucket is private. Server creates a temporary signed media URL for social preview; link scrapers may cache old preview after editing. If the platform does not display an image/video, check that api/c?code=... is publicly accessible, environment variables are set, and the campaign is active.

TEST: unlock an active campaign, copy Share Campaign Link and open it in a private browser, verify media, click advertiser CTA, then test WhatsApp link preview and native media sharing on an actual phone. Live platform previews cannot be guaranteed by code.
