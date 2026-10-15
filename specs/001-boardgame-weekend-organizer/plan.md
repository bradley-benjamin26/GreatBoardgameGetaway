# Implementation Plan: Boardgame Weekend Organizer

**Branch**: `001-boardgame-weekend-organizer` | **Date**: 2026-10-15 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `/specs/001-boardgame-weekend-organizer/spec.md`

## Summary

A small server-rendered web app for one friends' boardgame weekend. Attendees sign up with a shared
event code, build a game list (BoardGameGeek search or manual entry), mark games they want to play,
add physical tables, and schedule play sessions at a table with a start time and length. BoardGameGeek
needs a registered bearer token, so catalog lookups run on the server and results are stored locally.
The stack is deliberately plain (Principle II): HTML pages with a little progressive JavaScript, one
SQLite file, one process.

## Technical Context

**Language/Version**: TypeScript 5.x on Node.js 24 LTS

**Primary Dependencies**: Hono (HTTP routing and server-rendered JSX templates), better-sqlite3, fast-xml-parser (BGG XML responses), nodemailer (password-reset email over SMTP; the only dependency added for email). Password hashing uses Node's built-in `crypto.scrypt`, so no extra dependency.

**Storage**: SQLite, one file, created by plain SQL migrations

**Testing**: Vitest (unit, contract and integration via Hono's in-process `app.request`); Playwright with axe-core for accessibility and phone-viewport checks

**Target Platform**: Linux container or small VM behind HTTPS; browsers: current Safari/Chrome/Firefox on phone and desktop

**Project Type**: web-service with server-rendered pages (single project)

**Performance Goals**: pages interactive in under 2 s on throttled 3G; initial page weight under 150 KB compressed; 20 simultaneous users with no noticeable slowdown (SC-006)

**Constraints**: works at 320 px width; WCAG 2.2 AA; core flows work when BGG is unreachable (SC-005); BGG token never sent to the browser; no third-party scripts or fonts

**Scale/Scope**: ~30 users, 1 event, a few hundred games, ~10 screens

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Gate | Pre-research | Post-design |
|-----------|------|--------------|-------------|
| I. Test-First | Tests precede implementation; each acceptance scenario maps to a test | PASS: Vitest contract/integration tests are written first per task | PASS: quickstart and contracts list the testable scenarios |
| II. Simplicity | Smallest solution; new dependencies justified | PASS | PASS: 5 runtime dependencies (hono, @hono/node-server, better-sqlite3, fast-xml-parser, nodemailer), no SPA framework, no ORM, no external DB, no queue |
| III. Accessibility | WCAG 2.2 AA, keyboard, semantic HTML | PASS | PASS: server-rendered semantic HTML, native form controls, axe check in tests |
| IV. Privacy & Security | Minimal data, HTTPS, no committed secrets, validated input | PASS | PASS: only username, email (reset only) and password hash stored; secrets via environment; parameterised SQL; BGG token server-side only |
| V. Mobile-First | 320 px, 44 px targets, no hover-only | PASS | PASS: mobile-first CSS, checked in Playwright at 320 px |

No violations, so Complexity Tracking is empty.

## Project Structure

### Documentation (this feature)

```text
specs/001-boardgame-weekend-organizer/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   ├── http-routes.md
│   └── bgg-adapter.md
└── tasks.md             # created later by /speckit-tasks
```

### Source Code (repository root)

```text
src/
├── config.ts            # event code, event days, BGG token, from environment
├── db/
│   ├── index.ts
│   └── migrations/*.sql
├── services/
│   ├── auth.ts          # sign-up, sign-in, password reset, login sessions
│   ├── games.ts         # game list, listings, interest
│   ├── bgg.ts           # BGG search/thing adapter with local cache
│   ├── tables.ts
│   └── playSessions.ts  # scheduling, overlap rules, join/leave, host handover
├── routes/              # one file per area, thin: parse, call service, render
├── views/               # server-rendered JSX templates
├── public/              # one small CSS file, one small JS file
└── server.ts

tests/
├── contract/
├── integration/
└── unit/
```

**Structure Decision**: single project. A frontend/backend split is not needed because pages are
rendered on the server (Principle II).

## Complexity Tracking

None.
