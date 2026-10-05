Tenotemo Earn freeze fix — 05 Oct 2026

Two frontend render-loop hazards were removed:
1. The Advertising V2 MutationObserver was mutating option labels inside the same observed subtree, which could continuously retrigger itself and make the browser report “This page isn’t responding”. The Earn renderer already creates the correct WhatsApp Status / Facebook Story / Instagram Story labels, so the observer is no longer needed.
2. Rendering an already-unlocked campaign was calling tenotemo_register_campaign_share merely to determine the reward banner. Rendering is now read-only; campaign-share registration happens only after an explicit share action.

No Supabase SQL is required for this fix.
