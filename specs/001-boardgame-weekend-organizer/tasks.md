# Tasks: Boardgame Weekend Organizer

**Input**: Design documents from `/specs/001-boardgame-weekend-organizer/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/

**Tests**: Included. The constitution (Principle I) requires tests written first and seen to fail.

**Organization**: Grouped by user story so each can be built and tested on its own.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: can run in parallel (different files, no unfinished dependencies)
- **[Story]**: US1–US4 as in spec.md

## Phase 1: Setup

- [X] T001 Create `package.json` (Node 24, `"type": "module"`), `tsconfig.json` and the folders from plan.md: `src/{db/migrations,services,routes,views,public}`, `tests/{contract,integration,unit}`; `tsconfig.json` MUST set `"jsx": "react-jsx"` and `"jsxImportSource": "hono/jsx"` so `.tsx` views compile
- [X] T002 Install runtime deps `hono`, `@hono/node-server`, `better-sqlite3`, `fast-xml-parser`, `nodemailer` and dev deps `typescript`, `tsx`, `vitest`, `@playwright/test`, `@axe-core/playwright`, `eslint`, `prettier` in `package.json`
- [X] T003 [P] Add scripts `start`, `test` (vitest), `test:e2e` (playwright), `lint` and config files `eslint.config.js`, `.prettierrc`
- [X] T004 [P] Add `.gitignore` (node_modules, `*.db`, `.env`) and `.env.example` listing `EVENT_CODE`, `EVENT_DAYS`, `SESSION_SECRET`, `BGG_TOKEN`, `SMTP_URL`, `MAIL_FROM`, `DB_PATH`

## Phase 2: Foundational (blocking prerequisites)

**Purpose**: Config, database, accounts and page shell. No user story can start until this is done (covers FR-010, 013, 014, 015, 020).

- [X] T005 [P] Add test helpers `tests/helpers/app.ts` (in-memory database, app factory, sign-up helper) `tests/helpers/fakeBgg.ts` (implements the adapter in `contracts/bgg-adapter.md`) and `tests/helpers/fakeMailer.ts` (records sent emails)
- [X] T006 [P] Write failing unit test for config parsing (`EVENT_DAYS` as comma-separated ISO dates, required `EVENT_CODE`, `SESSION_SECRET`, `SMTP_URL` and `MAIL_FROM`, optional `BGG_TOKEN`) in `tests/unit/config.test.ts`
- [X] T007 [P] Write failing unit test for migration runner (applies `src/db/migrations/*.sql` in order once) in `tests/unit/migrate.test.ts`
- [X] T008 [P] Write failing unit tests for password hashing and login tokens (scrypt hash verifies; wrong password fails; token stored hashed; expired token rejected; reset token is random, stored hashed, valid for "1 hour", single use) in `tests/unit/auth.test.ts`
- [X] T009 [P] Write failing contract tests for `/signup`, `/signin`, `/signout`, `/reset` in `tests/contract/auth.test.ts`: wrong event code returns 403; duplicate username or email (case-insensitive) returns 409; username must be "3–30 chars" and email a valid address; `POST /reset` gives the same response for known and unknown emails and sends one email only for a known one; `POST /reset/:token` rejects an expired or used token with 400 and signs the user out everywhere; unauthenticated state-changing routes are refused
- [X] T010 Implement `src/config.ts` reading the environment per `.env.example`; fail fast with a clear message when required values are missing
- [X] T011 Implement `src/db/index.ts` (better-sqlite3, foreign keys on, WAL) and the migration runner, plus `src/db/migrations/001_users.sql` creating `users` (`id`, `username` unique case-insensitive, `email` unique case-insensitive, `password_hash`, `created_at`), `login_tokens` (`token_hash`, `user_id`, `expires_at`) and `password_reset_tokens` (`token_hash`, `user_id`, `expires_at`, `used_at`)
- [X] T012 Implement `src/services/auth.ts`: sign-up (checks event code, unique username and email), sign-in, sign-out, reset request (emails a link via `src/services/mailer.ts`, a thin nodemailer wrapper) and reset completion, scrypt hashing from `node:crypto`, random login tokens stored hashed, per-IP attempt limiting
- [X] T013 Implement `src/routes/auth.ts`, `src/views/layout.tsx` (semantic landmarks, skip link, viewport meta, visible focus) and `src/views/auth.tsx` forms (sign-up, sign-in, reset request, new password) with labels and plain error messages
- [X] T014 [P] Implement `src/public/app.css`: mobile-first, works at 320 px, 44×44 px minimum touch targets, system font stack, AA contrast, `prefers-reduced-motion` respected
- [X] T015 Implement `src/server.ts`: Hono app factory (so tests can call `app.request`), cookie auth middleware (HttpOnly, Secure, SameSite=Lax), CSRF token on state-changing routes, security headers, error handler that never shows stack traces, static file serving

**Checkpoint**: Users can sign up with the event code, sign in on any device and see an empty home page. Auth tests pass.

---

## Phase 3: User Story 1 - Build my game list (Priority: P1) 🎯 MVP

**Goal**: Attendees build a personal game list from BoardGameGeek search or manual entry, mark games owned and/or bringing, and see the combined list of games being brought.

**Independent Test**: A new user adds one game from search (fake adapter) and one by hand, marks one as bringing, and sees both with correct details and flags, and the bringing game shows in the combined games list; with the catalog down, manual entry still works.

- [X] T016 [P] [US1] Write failing unit tests for the BGG adapter in `tests/unit/bgg.test.ts`: parse `search` and `thing` XML fixtures, send `Authorization: Bearer`, host without `www`, max 1 request per second, 5 s timeout, retry once on HTTP 202, throw `CatalogUnavailable` on timeout/401/429
- [X] T017 [P] [US1] Write failing contract tests in `tests/contract/games.test.ts` for `GET /games` (combined list of games being brought, FR-004), `GET /games/search`, `POST /my/games` (BGG and manual) and `POST /my/games/:gameId`: manual games require title, min/max players and play time, "`min_players` ≤ `max_players`"; a row with both flags false is deleted
- [X] T018 [P] [US1] Write failing integration test in `tests/integration/us1-game-list.test.ts` covering the independent test above (including the combined games list) and the catalog-unavailable notice (FR-012, SC-005)
- [X] T019 [US1] Add `src/db/migrations/002_games.sql` creating `games` (`id`, `title`, `min_players`, `max_players`, `play_minutes`, `image_url` optional, `bgg_id` unique and null for custom, `created_by` for custom games only, `fetched_at`) and `listings` (`user_id`, `game_id`, `owned`, `bringing`, unique on (`user_id`, `game_id`))
- [X] T020 [US1] Implement `src/services/bgg.ts` per `contracts/bgg-adapter.md`: `search`, `getGame`, local storage of fetched games (FR-011)
- [X] T021 [US1] Implement `src/services/games.ts`: add from BGG id (reuses stored copy), add manual game with validation, set owned/bringing, list the combined games being brought, delete listing when both flags are false
- [X] T022 [US1] Implement `src/routes/games.ts` (`GET /games`, `GET /games/search`, `GET /my/games`, `POST /my/games`, `POST /my/games/:gameId`) `src/views/gamesList.tsx` (title, player range, play time, image, who is bringing) and `src/views/myGames.tsx` with search form, manual form, toggles, "search unavailable" notice and BGG attribution

**Checkpoint**: US1 works alone and is demonstrable (MVP).

---

## Phase 4: User Story 2 - Say what I want to play (Priority: P2)

**Goal**: Everyone can mark interest in the games on the combined list and see counts.

**Independent Test**: Two users mark the same game; both see a count of 2 and the names; a game nobody is bringing shows as unavailable.

- [X] T023 [P] [US2] Write failing contract tests in `tests/contract/interest.test.ts` for `GET /games`, `POST /games/:gameId/interest` and `DELETE /games/:gameId/interest` (unique pair, count rises and falls by one)
- [X] T024 [P] [US2] Write failing integration test in `tests/integration/us2-interest.test.ts` for the independent test above
- [X] T025 [US2] Add `src/db/migrations/003_interest.sql` creating `interest` (`user_id`, `game_id`, unique pair)
- [X] T026 [US2] Extend `src/services/games.ts` with interest counts and names, mark/unmark interest
- [X] T027 [US2] Extend `GET /games` with interest data and add the interest routes in `src/routes/games.ts`; extend `src/views/gamesList.tsx` (count, interested names, unavailable label, native buttons)

**Checkpoint**: US1 and US2 both work independently.

---

## Phase 5: User Story 3 - Set up the tables (Priority: P3)

**Goal**: Anyone can add, rename and remove physical tables.

**Independent Test**: A user adds "Basement table" (6 seats) and "Dining room table" (8 seats); both show for everyone.

- [X] T028 [P] [US3] Write failing contract tests in `tests/contract/tables.test.ts` for `GET/POST /tables`, `POST /tables/:id` and `POST /tables/:id/delete`: "`name` (unique)", "`seats` (optional, ≥ 1)"; removing a table that has sessions needs confirmation (FR-017)
- [X] T029 [P] [US3] Write failing integration test in `tests/integration/us3-tables.test.ts` for the independent test above
- [X] T030 [US3] Add `src/db/migrations/004_tables.sql` creating `tables` (`id`, `name` unique, `seats` optional, `created_by`)
- [X] T031 [US3] Implement `src/services/tables.ts` (add, rename, remove with a hook for the sessions check added in US4)
- [X] T032 [US3] Implement `src/routes/tables.ts` and `src/views/tables.tsx`

**Checkpoint**: Tables can be managed independently.

---

## Phase 6: User Story 4 - Schedule a game at a table (Priority: P4)

**Goal**: Attendees schedule play sessions at tables, join and leave them, and hosts can edit, cancel or hand over.

**Independent Test**: One user schedules a 2-4 player game at the basement table; three others join; a fifth is refused as full; a second session at the same table and time is refused.

- [X] T033 [P] [US4] Write failing unit tests for overlap and seat rules in `tests/unit/playSessions.test.ts`: "`start_minute` (0–1410, multiple of 30)", "`length_minutes` (multiple of 30, ≥ 30, ≤ 1440)", a session may end on the next day, same-table overlap refused in absolute time including across midnight (22:00 for 3 hours blocks 00:30 next day), seat limit = min(game max players, table seats), game must be marked bringing
- [X] T034 [P] [US4] Write failing contract tests in `tests/contract/sessions.test.ts` for `POST /sessions`, `/sessions/:id/join`, `/leave`, `/cancel`, `/handover` (full returns 409; overlap warning needs `confirm=1`; only the host may cancel or hand over; sole host leaving cancels)
- [X] T035 [P] [US4] Write failing integration tests in `tests/integration/us4-sessions.test.ts` for the independent test above, the last-seat race (two joins at once, one wins) and removing a table that has sessions
- [X] T036 [P] [US4] Write failing contract and integration tests in `tests/contract/sessionEdit.test.ts` for `POST /sessions/:id/edit`: only the host may edit; changing table, day, start or length re-runs the overlap rule ignoring the session itself; refused when "seat limit" would fall below players joined; joined players see the new values
- [X] T037 [US4] Add `src/db/migrations/005_play_sessions.sql` creating `play_sessions` (`id`, `game_id`, `table_id`, `day`, `start_minute`, `length_minutes`, `host_id`, `status` scheduled|cancelled, `created_at`) and `play_session_players` (`play_session_id`, `user_id`, unique pair)
- [X] T038 [US4] Implement `src/services/playSessions.ts`: create (validates day is in `EVENT_DAYS`), join/leave inside one SQLite transaction, overlap rule on absolute start/end minutes (see `research.md` §6), overlap warning for the user's other sessions, cancel, host handover, auto-cancel when the sole host leaves
- [X] T039 [US4] Add `editSession` to `src/services/playSessions.ts` (table, day, start, length; same validation as create, in one transaction)
- [X] T040 [US4] Wire the table-removal check in `src/services/tables.ts` to warn about and cancel scheduled sessions on confirmation (FR-017)
- [X] T041 [US4] Implement `src/routes/sessions.ts`, `GET /schedule` and `src/views/schedule.tsx` (grouped by day then table, remaining seats, cancelled sessions shown as cancelled, native `<select>` and `<input type="time" step="1800">`-style controls for half-hour starts)
- [X] T042 [US4] Implement `POST /sessions/:id/edit` in `src/routes/sessions.ts` and `src/views/sessionEdit.tsx` (prefilled form, host only)

**Checkpoint**: All four stories work independently and together.

---

## Phase 7: Polish & Cross-Cutting Concerns

- [X] T043 [P] Add Playwright + axe-core test `tests/e2e/a11y.spec.ts` for sign-in, my games, games list, tables and schedule (WCAG 2.2 AA, keyboard-only completion of the core flow)
- [X] T044 [P] Add Playwright test `tests/e2e/mobile.spec.ts` at 320 px: no horizontal scroll, controls at least 44×44 px, no hover-only interaction (SC-004)
- [X] T045 [P] Add `tests/integration/load.test.ts` for SC-006: 20 simulated users sign up, browse games and join sessions in parallel against the in-process app; assert every request succeeds and 95% finish within 1 second
- [X] T046 [P] Add `tests/e2e/weight.spec.ts` failing when the compressed transfer size of any core page with its CSS and JS exceeds 150 KB, then enable gzip/brotli and cache headers for `src/public/` in `src/server.ts` (plan performance goals)
- [X] T047 [P] Write `README.md` covering setup, environment variables, registering a BGG application, backups of the SQLite file and HTTPS hosting
- [X] T048 Run every scenario in `quickstart.md` and fix any gap found
- [X] T049 Review `src/` against the constitution (no secrets in git, parameterised SQL everywhere, no third-party scripts or fonts) and `npm audit` for high-severity issues

---

## Dependencies & Execution Order

- Phase 1 → Phase 2 → user stories → Phase 7.
- US1 needs only Phase 2. US2 reads games from US1. US3 needs only Phase 2. US4 needs games (US1) and tables (US3).
- Within each story: failing tests first, then migration, service, routes and views.
- Suggested order: US1 → US2 → US3 → US4. US2 and US3 can run in parallel once US1 is done.

## Parallel Example: User Story 1

Run together: the three test tasks at the start of Phase 3 (different files). Then the migration, `bgg.ts` and `games.ts` in order.

## Implementation Strategy

- **MVP**: Phases 1–3 (accounts plus game lists). Stop and try it with a couple of friends.
- Then add US2, US3 and US4 one at a time, validating each against its independent test.
- BGG approval may take a week or more; US1 is fully testable with the fake adapter and manual entry in the meantime.
