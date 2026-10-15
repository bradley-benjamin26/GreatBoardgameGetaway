# Quickstart: Validation Guide

## Prerequisites
- Node.js 24, `npm install`.
- Environment: `EVENT_CODE=testcode`, `EVENT_DAYS=2026-11-06,2026-11-07,2026-11-08`,
  `SESSION_SECRET=<random>`, `SMTP_URL` and `MAIL_FROM` (tests use a fake mailer; for manual runs a local mail catcher such as MailHog works). `BGG_TOKEN` is optional; without it, manual entry still works.

## Run
- Tests: `npm test`. Accessibility and phone checks: `npm run test:e2e`.
- App: `npm start`, then open http://localhost:3000 (use a phone-sized window).

## Scenarios (map to the spec)
1. **Sign up** with a wrong code: refused. With `testcode`, a username and an email: account created, signed in (FR-010, 015).
   **Reset**: request a reset for that email, open the emailed link, set a new password, and confirm the old password and the link no longer work (FR-013).
2. **Add a game** by search (needs `BGG_TOKEN`) and by hand; mark one "bringing" (US1).
3. **Catalog down**: unset `BGG_TOKEN`; search shows a notice, manual entry still works (SC-005).
4. **Interest**: second user marks the same game; both see a count of 2 (US2).
5. **Tables**: add "Basement table" with 6 seats and "Dining room table" (US3).
6. **Schedule**: schedule a 2–4 player game at the basement table; three users join; a fifth is refused;
   a second session at the same table and time is refused (US4).
7. **Edit and midnight**: host moves a session to a new time; a 22:00 session of 3 hours runs to 01:00 and blocks the table; an edit that double-books the table is refused (FR-016, 019).
8. **Host**: host hands over to a joined player; host cancels a session; sole host leaving cancels it (FR-018).
9. **Phone**: at 320 px width there is no horizontal scroll and all controls are at least 44×44 px (SC-004).
10. Details: see [http-routes.md](contracts/http-routes.md) and [data-model.md](data-model.md).
