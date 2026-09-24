TENOTEMO — EARN-FIRST / DAILY CHALLENGES / OCEAN SPIN RESET

1. In Supabase SQL Editor, run tenotemo_daily_challenges_focus_update.sql ONCE.
   Prerequisite: earlier Tenotemo Earn, individual advertiser, and 60/40 previous-day migrations.
2. Upload index.html, tenotemo-spotlight.js, tenotemo-earn.js and the api folder
   into the ROOT of your existing GitHub repository. Keep api/r.js in api/.
   tenotemo-versus.js is included for compatibility but multiplayer UI is hidden.
3. Let Vercel deploy. Refresh Safari after deployment; consider clearing website
   cache if an older version still appears.
4. Sign in; check Today’s Daily Challenges (0/5 before playing) and play each
   game for positive points. Confirm it updates once per game per SA day.
5. Restart My Games; Ocean Spin must start at Round 1/6, Stop 1/4.
6. Verify leaderboard Today and Previous Day. Historical results are intentionally
   preserved; restarting your games DOES NOT delete previously recorded daily
   rankings, claimed Memory Credits or advertiser campaign earnings.

WHAT CHANGED
- No All-time ranking or Multiplayer standings in player-facing menus.
- Daily Top 50 stays; opens Today by default, Previous Day available.
- Premium R50/month copy emphasizes Spotlight posting, not multiplayer.
- Five real daily challenges: score positive points in each of five games.
  1 Memory Credit per unique game/day, plus 2 for all five, claim next day.
- No credits for a game that was not actually played under this release.
- Ocean Spin saved final round is discarded on re-entry; Restart My Games
  clears its saved snapshot and returns it to Round 1.
- No game progress or financial records are deleted from Supabase by this SQL.

IMPORTANT HISTORICAL DATA
The previous migration awarded daily challenge credits from score rows, not
actual challenge completions. Existing claims/balances remain untouched to
avoid silently confiscating credits. The new system records completions from
this release onward; previous dates cannot be reconstructed reliably. A player
who claimed an older day sees their original awarded amount in their own row.

LIMITATIONS
This pilot records successful gameplay actions via the browser and Supabase.
It is NOT independent server-side gameplay verification and is not suitable
as the sole anti-fraud control for monetary rewards. Cash earnings in Tenotemo
Earn remain admin-approved based on independently verified advertiser results.
The current Premium Spotlight eligibility rules and credit issuance are not
changed by this update; only the public Premium messaging is simplified.
