TENOTEMO MENU / POINTS / PAYOUT UPDATE — 11 OCT 2026

Changes made in this ZIP:
- Main menu: Share to Earn and expandable Earn Credit Points games folder.
- My Profile and My Accounts navigation; existing administrator controls preserved.
- Public leaderboard and Daily Challenge rewards removed from visible UI. Existing database history retained.
- Game points automatically convert to Memory Credits after successful secure game progress sync and on login, using the EXISTING tenotemo_claim_game_point_credits RPC (50 points = 1 Memory Credit). Claim button hidden.
- R20 EFT payout: existing bank details form opened by default, request button clearer.
- Spotlight wording no longer promises Top 50 rewards.

NOT YET IMPLEMENTED:
- R10 premium promotion claims and administrator selections. They need coordinated backend reservation, proof and payout changes to avoid unfunded/double claims. Do not advertise R10 availability yet.
- Removal of historical leaderboard/daily challenge database functions; kept for backward compatibility.
- R1/R2/R5 timed sessions and analytics (deferred as requested).

DEPLOYMENT:
- This ZIP is a FRONTEND update. The existing R2 Supabase SQL must already be installed.
- Check game points conversion and EFT bank details in a test account after deployment.
- Do not execute old SQL files in this ZIP again merely to deploy this update.
