TENOTEMO R10 PREMIUM PROMOTIONS UI

1. First run TENOTEMO_R10_FRONTEND_READ_ACCESS.sql in Supabase SQL Editor.
   The earlier premium migration revoked direct table reads; the UI needs narrowly scoped read policies.
2. Deploy this entire ZIP to Vercel (keep all files together).
3. Sign in as admin -> Share to Earn -> Administration -> R10 Premium Promotions.
4. Select active business campaign and promotion date; click Activate R10 promotion.
5. Sign in as player -> Share to Earn -> R10 Premium Shares. Five approved ordinary shares dated today required before reservation.
6. Admin reviews R10 proof; only after approval does R10 enter cash earnings.

LIMITATIONS / IMPORTANT:
- No live Supabase end-to-end testing performed. Test with controlled accounts before promoting to public users.
- Premium reservations do not expire or release automatically; two reservations consume the day's two places.
- R10 promotion funding is tracked separately but the earlier SQL does not enforce a global marketing spend cap.
- Existing R10 SQL requires shared_at to be at or after claim time, same promotion day.
- The earlier backend accepts 20+ views for premium; ordinary review UI currently uses 21+.
