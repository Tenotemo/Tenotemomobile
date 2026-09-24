TENOTEMO EARN — PICTURE & VIDEO CAMPAIGNS

1. FIRST run tenotemo_campaign_picture_video.sql in Supabase SQL Editor. This is an ADDITIONAL migration, after the smooth campaign SQL.
2. Upload index.html, tenotemo-earn.js, tenotemo-spotlight.js, tenotemo-versus.js and the api/ folder to the ROOT of the existing GitHub repo. Preserve api/r.js.
3. Wait for Vercel, hard-refresh, sign in as administrator, open Tenotemo Earn > Advertiser campaign administration.
4. Choose an advertiser with an active paid package. Select JPG/PNG/WebP up to 5 MB or MP4/WebM/MOV up to 30 MB and 30 seconds. Check preview, enter approved text, title, reward rules, HTTPS advertiser link, budget, end date, then publish.
5. Verify campaign is shown under Available business & service campaigns and media appears on Spotlight. Players share their unique campaign referral link, NOT the raw media URL. Visits remain indicative; no automatic cash payouts.

NOTE: Video duration is checked by the browser and requires admin moderation; Supabase Storage enforces MIME type and 30 MB but not video duration. This is a pilot, not tamper-proof media moderation. An HTTPS advertiser destination is now required for a usable referral link. Media uploaded before a failed publication is removed when possible; an orphan file can remain after network failure.
Existing personal Spotlight picture uploads remain JPG/PNG/WebP up to 2 MB; video is for admin-published advertiser campaigns only. Do not re-run the original Spotlight migration after this update unless you review its storage settings.
