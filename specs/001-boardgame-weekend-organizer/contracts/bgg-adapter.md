# BGG Adapter Contract

Internal interface used by `services/games.ts`; the only code that talks to BoardGameGeek.

- `search(query: string): Promise<{ bggId: number; title: string; year?: number }[]>`
  Calls `GET https://boardgamegeek.com/xmlapi2/search?query=<q>&type=boardgame`.
- `getGame(bggId: number): Promise<Game>`
  Calls `GET https://boardgamegeek.com/xmlapi2/thing?id=<id>`; maps min/max players, playing time,
  title and thumbnail. Stores the result in `Game` and returns the stored copy on later calls.

Rules
- Every request sends `Authorization: Bearer <BGG_TOKEN>` and goes to the host without `www`.
- At most 1 request per second; timeout 5 s; on timeout, error or 401/429 throw `CatalogUnavailable`.
- Routes catch `CatalogUnavailable` and show the FR-012 message; manual entry stays available.
- BGG returns 202 while preparing some responses; retry once after a short delay, then fail as above.
- Tests use a fake adapter; one optional smoke test hits the real API only when `BGG_TOKEN` is set.
- Show BGG attribution wherever its data appears, per the terms confirmed before launch.
