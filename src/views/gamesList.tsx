import type { BroughtGame } from "../services/games.js";
import { Summary } from "./gameBits.js";
import { Csrf, Layout, type Page } from "./layout.js";

export const GamesList = (p: Page & { games: BroughtGame[] }) => (
  <Layout title="Games" user={p.user} csrf={p.csrf}>
    <h1>Games being brought</h1>
    {p.games.length === 0 ? (
      <p>
        Nobody has said they're bringing a game yet. <a href="/my/games">Add yours</a>.
      </p>
    ) : (
      <ul class="list">
        {p.games.map((g) => (
          <li>
            <Summary g={g} />
            <div>Bringing: {g.bringers}</div>
            <div>
              {g.wanted} want to play{g.wanters && `: ${g.wanters}`}
            </div>
            <form method="post" action={`/games/${g.id}/interest`}>
              <Csrf token={p.csrf} />
              {g.iWant ? <input type="hidden" name="_method" value="DELETE" /> : null}
              <button type="submit">
                {g.iWant ? "I no longer want to play this" : "I want to play this"}
              </button>
            </form>
          </li>
        ))}
      </ul>
    )}
  </Layout>
);
