# Research: Boardgame Weekend Organizer

## 1. BoardGameGeek access

- **Decision**: Call the BGG XML API v2 (`search` and `thing`) only from the server, with a bearer
  token from a registered BGG application, and store every fetched game locally.
- **Rationale**: BGG's official page ([Using the XML API](https://boardgamegeek.com/using_the_xml_api),
  dated 2025-07-02) says registration and a bearer token are required for nearly all use, and approval
  may take a week or more. A secret token cannot live in browser code, so the call must be server-side.
  Local storage satisfies FR-011 and keeps core flows working when BGG is down (SC-005).
- **Alternatives**: Browser-side calls (would expose the token); scraping (against terms); shipping a
  static game dataset (loses live search, which the user asked for).
- **Open risk**: I could not read the official terms or rate limits directly (page returned 403 to my
  fetcher). Before launch, read them and confirm the permitted caching and the attribution wording.
  Until the token is approved, manual entry (FR-002) is the only way to add games.
- **Throttle**: at most 1 BGG request per second, with a short timeout and clear user message on failure (FR-012).

## 2. Application shape

- **Decision**: Server-rendered HTML, plain forms, minimal JavaScript, one Node process.
- **Rationale**: Smallest page weight, works on old phones and slow networks, accessible by default
  (Principles II, III, V). Updates appear on page reload; live push is not required by the spec.
- **Alternatives**: React/Next SPA (large bundle, more code); native app (spec says web).

## 3. Stack choices

- **Decision**: TypeScript on Node 24 LTS; Hono; better-sqlite3; fast-xml-parser; Vitest; Playwright + axe-core.
- **Rationale**: Hono is tiny and testable without a network. SQLite is enough for ~30 users and needs
  no separate server. TypeScript catches schema/route mistakes cheaply.
- **Alternatives**: Express (heavier, same result); Postgres (extra service for no benefit at this scale);
  an ORM (extra layer for ~8 tables).

## 4. Authentication

- **Decision**: Username and password; scrypt hashing from Node `crypto`; random login token in an
  HttpOnly, Secure, SameSite=Lax cookie, stored server-side; sign-up requires the shared event code;
  sign-in and sign-up attempts are rate-limited per IP.
- **Password reset (FR-013, FR-021)**: Each account has an email address. A reset request sends a
  single-use link that expires after 1 hour; only its hash is stored. The page gives the same answer
  whether or not the email is registered. The email is used only for resets and is never shown to
  other users. Sending uses SMTP through nodemailer, configured by `SMTP_URL` and `MAIL_FROM`.
- **Alternatives**: Event code plus username reset (rejected: anyone with the code could take over any
  account); magic links for sign-in (rejected in clarification); a hosted email API (adds a vendor and
  SDK for no gain over SMTP).

## 5. Event configuration

- **Decision**: `EVENT_CODE`, `EVENT_DAYS` (comma-separated dates), `BGG_TOKEN`, `SMTP_URL` and `MAIL_FROM` come from
  environment variables, read at startup (FR-020).
- **Rationale**: No organizer role in v1 (clarification). Environment variables keep secrets out of git.

## 6. Time model

- **Decision**: A session stores an event day, a start in minutes from midnight (multiple of 30,
  0-1410) and a length in minutes (multiple of 30, from 30 up to 1440). Sessions may run past midnight
  into the next day (FR-019). Overlap is compared on absolute minutes: day number x 1440 + start for
  the start, plus the length for the end. The end day need not be an event day.
- **Rationale**: One integer range comparison covers same-day and cross-midnight cases. The 24-hour
  cap is my addition; the spec set no limit and an unbounded length would be an untested edge.

## 7. Seat limit and concurrency

- **Decision**: Seat limit = game's max players, or the table's seat count if smaller. Joins and
  overlap checks run inside a single SQLite transaction so two people cannot take the last seat.
- **Alternatives**: Application-level locks (unneeded with one process and SQLite transactions).

## 8. Game identity

- **Decision**: BGG games are shared, keyed by BGG id. Custom games belong to the user who made them
  and require title, min/max players and play time, since seats depend on them. Duplicate custom titles
  are allowed.
- **Rationale**: Avoids a merge feature (Principle II).

## 9. Testing and accessibility checks

- **Decision**: Contract and integration tests call routes in-process; BGG is replaced by a fake in
  tests. Playwright runs axe-core and a 320 px viewport check on key pages.

## 10. Hosting

- **Decision**: One small container or VM with HTTPS from the host or a reverse proxy, SQLite file on a
  persistent volume with a nightly copy. Host choice is deferred; prefer one that publishes energy-mix data.
