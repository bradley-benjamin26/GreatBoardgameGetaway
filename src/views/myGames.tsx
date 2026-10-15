import type { CatalogHit } from "../types.js";
import type { Listing } from "../services/games.js";
import { Flags, ManualForm, Summary } from "./gameBits.js";
import { Csrf, ErrorNote, Layout, type Page } from "./layout.js";

const SearchForm = ({ q }: { q?: string }) => (
  <form method="get" action="/games/search" role="search">
    <label>
      Search the BoardGameGeek catalog
      <input name="q" value={q} required />
    </label>
    <button type="submit">Search</button>
  </form>
);

export const MyGames = (p: Page & { listings: Listing[]; error?: string }) => (
  <Layout title="My games" user={p.user} csrf={p.csrf}>
    <h1>My games</h1>
    <ErrorNote message={p.error} />
    {p.listings.length === 0 && <p>You haven't added any games yet.</p>}
    <ul class="list">
      {p.listings.map((g) => (
        <li>
          <Summary g={g} />
          <form method="post" action={`/my/games/${g.id}`}>
            <Csrf token={p.csrf} />
            <Flags owned={g.owned} bringing={g.bringing} />
            <button type="submit">Save</button>
          </form>
        </li>
      ))}
    </ul>
    <SearchForm />
    <ManualForm csrf={p.csrf} />
  </Layout>
);

export const SearchResults = (p: Page & { q: string; hits?: CatalogHit[] }) => (
  <Layout title="Search games" user={p.user} csrf={p.csrf}>
    <h1>Search games</h1>
    <SearchForm q={p.q} />
    {p.hits === undefined ? (
      <p role="alert" class="error">
        Game search is unavailable right now. You can still add a game by hand below.
      </p>
    ) : p.hits.length === 0 ? (
      <p>No games found for "{p.q}".</p>
    ) : (
      <ul class="list">
        {p.hits.map((h) => (
          <li>
            <strong>{h.title}</strong> {h.year && <span class="muted">({h.year})</span>}
            <form method="post" action="/my/games">
              <Csrf token={p.csrf} />
              <input type="hidden" name="bggId" value={String(h.bggId)} />
              <Flags owned />
              <button type="submit">Add</button>
            </form>
          </li>
        ))}
      </ul>
    )}
    <ManualForm csrf={p.csrf} />
  </Layout>
);
