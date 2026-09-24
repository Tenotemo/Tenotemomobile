TENOTEMO SPOTLIGHT REFRESH — 24 September 2026

1. In Supabase SQL Editor, run tenotemo_spotlight_premium_controls.sql after your earlier Spotlight and Earn SQL. It creates personal edit/remove functions, 24-hour expiry, and updates the feed.
2. Upload index.html, tenotemo-spotlight.js, tenotemo-earn.js, tenotemo-versus.js and api/ to the same GitHub repo; preserve api/c.js and api/r.js.
3. Refresh Safari (if needed clear website cache). Test an advertiser image/video and a personal image/video.
4. Existing personal posts older than 24 hours since approval will no longer appear. Campaigns keep their own end date. Rank and poster username are removed from the public Spotlight slide.
5. Edits to personal posts go back to admin review. Remove hides them but retains the records. Media video cap 30 seconds / 30 MB, personal image cap 2 MB.

IMPORTANT: The SQL assumes prior Tenotemo Earn campaign tables exist. This is not a replacement for earlier migrations. This package was syntax-checked, NOT tested on the live Supabase database.
