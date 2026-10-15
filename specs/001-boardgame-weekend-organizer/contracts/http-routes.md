# HTTP Routes

Server-rendered pages. Forms post with standard encoding; every state-changing route needs a signed-in
user and a CSRF token except `POST /signup`, `POST /signin`, `POST /reset` and `POST /reset/:token`.
Errors re-render the form with a plain message and HTTP 400/403/409; no stack traces.

| Route | Purpose | Spec |
|-------|---------|------|
| `GET/POST /signup` | Username, email, password, event code. 409 on duplicate username, 403 on wrong code | FR-010, 014, 015 |
| `GET/POST /signin`, `POST /signout` | Sign in and out | FR-010 |
| `GET/POST /reset` | Email only; always shows the same "if that address is registered, a link was sent" message | FR-013, 021 |
| `GET/POST /reset/:token` | New password; 400 for an expired or used token | FR-013 |
| `GET /games` | Combined list of games being brought (US1); interest counts and marks are added in US2 | FR-004, 005 |
| `GET /my/games` | My list with owned/bringing toggles | FR-003 |
| `GET /games/search?q=` | BGG search results (or "search unavailable" notice) | FR-001, 012 |
| `POST /my/games` | Add from BGG (`bggId`) or manual (`title`, `minPlayers`, `maxPlayers`, `playMinutes`) | FR-001, 002 |
| `POST /my/games/:gameId` | Set owned/bringing | FR-003 |
| `POST /games/:gameId/interest`, `DELETE ...` | Mark / unmark want to play | FR-005 |
| `GET/POST /tables`, `POST /tables/:id`, `POST /tables/:id/delete` | List, add, rename, remove (confirm if sessions exist) | FR-006, 017 |
| `GET /schedule` | Sessions grouped by day then table | FR-007 |
| `POST /sessions` | Create: `gameId`, `tableId`, `day`, `start`, `lengthMinutes` | FR-007, 008, 019 |
| `POST /sessions/:id/join`, `/leave` | Join or leave; 409 when full; overlap warning needs `confirm=1` | FR-008, 009 |
| `POST /sessions/:id/edit` | Host changes `tableId`, `day`, `start`, `lengthMinutes`; 409 on overlap or too few seats | FR-016 |
| `POST /sessions/:id/cancel` | Host cancels outright | FR-016, 018 |
| `POST /sessions/:id/handover` | Host leaves, `newHostId` = a joined player | FR-018 |

Authorization: only the host may cancel or hand over; any signed-in user may add or rename tables.
