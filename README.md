# Great Boardgame Getaway

A small web app for organizing a boardgame weekend with friends. Everyone adds the games they own or
are bringing, says what they want to play, and schedules play sessions at tables.

Specs and plan live in `specs/001-boardgame-weekend-organizer/`; project rules are in
`.specify/memory/constitution.md`.

## Run it

Requires Node.js 24 or newer.

```sh
npm install
cp .env.example .env     # then edit the values
npm start                # loads settings from the environment, see below
```

`npm start` loads settings from `.env` when the file exists. Values already set in the shell or
process environment take precedence. In hosted environments, provide settings through the host's
environment configuration instead.

Generate a session secret with:

```sh
npm run --silent generate:session-secret
```

Copy the output into `SESSION_SECRET` in `.env` (replacing the placeholder), or into your host's
environment configuration. The command generates 32 cryptographically random bytes as 64 hexadecimal
characters; it does not modify `.env`. Keep the secret private and stable across restarts.

| Setting           | Required | Meaning                                                                        |
| ----------------- | -------- | ------------------------------------------------------------------------------ |
| `EVENT_CODE`      | yes      | Shared code friends enter to create an account. Hand it out outside the app.   |
| `EVENT_DAYS`      | yes      | Comma-separated dates of the event, e.g. `2026-11-06,2026-11-07`.              |
| `SESSION_SECRET`  | yes      | Random string of 32+ characters.                                               |
| `SMTP_URL`        | yes      | Outgoing mail server for password-reset links, e.g. `smtp://user:pw@host:587`. |
| `MAIL_FROM`       | yes      | From address for those emails.                                                 |
| `BASE_URL`        | no       | Public address used in reset links. Default `http://localhost:3000`.           |
| `BGG_TOKEN`       | no       | BoardGameGeek API token. Without it, game search is off; manual entry works.   |
| `DB_PATH`         | no       | SQLite file. Default `./getaway.db`.                                           |
| `PORT`            | no       | Default 3000.                                                                  |
| `COOKIE_INSECURE` | no       | Set to `1` only for local http testing; otherwise cookies are `Secure`.        |

## BoardGameGeek token

BoardGameGeek requires a registered application and a bearer token for its XML API
([Using the XML API](https://boardgamegeek.com/using_the_xml_api)). Approval can take a week or more.
Register at BGG, create a token, and set `BGG_TOKEN`. Read their terms on caching and attribution
before launch; the app shows a "Game data from BoardGameGeek" credit and stores fetched games locally.

## Hosting

- Serve it over HTTPS (a reverse proxy or your host's TLS). Cookies are `Secure`, so sign-in will not
  work over plain http except with `COOKIE_INSECURE=1`.
- The proxy should set `X-Forwarded-For`; sign-in attempts are rate-limited per address.
- Keep the SQLite file on a persistent volume and copy it regularly, e.g. nightly
  (`sqlite3 getaway.db ".backup backup.db"`).
- Prefer a host that publishes its energy mix.

## Test

```sh
npm test            # unit, contract and integration tests
npm run test:e2e    # accessibility, 320 px phone and page-weight checks (needs: npx playwright install chromium)
npm run lint
```
