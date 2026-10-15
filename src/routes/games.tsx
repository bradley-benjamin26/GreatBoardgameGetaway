import { Hono, type Context } from "hono";
import type { Env } from "../app.js";
import type { Games } from "../services/games.js";
import { AppError, CatalogUnavailable } from "../types.js";
import { GamesList } from "../views/gamesList.js";
import { MyGames, SearchResults } from "../views/myGames.js";

export function gameRoutes(games: Games) {
  const r = new Hono<Env>();
  const page = (c: Context<Env>) => ({ user: c.get("user"), csrf: c.get("csrf") });
  const flags = (b: Record<string, unknown>) => ({
    owned: b.owned === "1",
    bringing: b.bringing === "1",
  });
  const strings = (b: Record<string, unknown>) =>
    Object.fromEntries(Object.entries(b).filter(([, v]) => typeof v === "string")) as Record<
      string,
      string
    >;

  r.get("/games", (c) =>
    c.html(<GamesList {...page(c)} games={games.broughtGames(c.get("user")!.id)} />),
  );

  // HTML forms can only POST, so a hidden _method=DELETE field removes the mark
  r.post("/games/:gameId/interest", async (c) => {
    const remove = (await c.req.parseBody())._method === "DELETE";
    games.setInterest(c.get("user")!.id, Number(c.req.param("gameId")), !remove);
    return c.redirect("/games", 303);
  });
  r.delete("/games/:gameId/interest", (c) => {
    games.setInterest(c.get("user")!.id, Number(c.req.param("gameId")), false);
    return c.redirect("/games", 303);
  });

  r.get("/games/search", async (c) => {
    const q = (c.req.query("q") ?? "").trim();
    if (!q) return c.redirect("/my/games", 303);
    try {
      return c.html(<SearchResults {...page(c)} q={q} hits={await games.search(q)} />);
    } catch (e) {
      if (!(e instanceof CatalogUnavailable)) throw e;
      return c.html(<SearchResults {...page(c)} q={q} />);
    }
  });

  r.get("/my/games", (c) =>
    c.html(<MyGames {...page(c)} listings={games.myListings(c.get("user")!.id)} />),
  );

  r.post("/my/games", async (c) => {
    const b = await c.req.parseBody();
    const userId = c.get("user")!.id;
    try {
      if (typeof b.bggId === "string") {
        if (!/^\d+$/.test(b.bggId)) throw new AppError(400, "That isn't a valid game.");
        await games.addFromBgg(userId, Number(b.bggId), flags(b));
      } else {
        games.addManual(userId, strings(b), flags(b));
      }
      return c.redirect("/my/games", 303);
    } catch (e) {
      const status = e instanceof CatalogUnavailable ? 503 : e instanceof AppError ? e.status : 0;
      if (!status) throw e;
      const error =
        e instanceof CatalogUnavailable
          ? "Game search is unavailable right now. You can still add a game by hand."
          : (e as Error).message;
      return c.html(
        <MyGames {...page(c)} listings={games.myListings(userId)} error={error} />,
        status as 400,
      );
    }
  });

  r.post("/my/games/:gameId", async (c) => {
    const id = Number(c.req.param("gameId"));
    games.setFlags(c.get("user")!.id, id, flags(await c.req.parseBody()));
    return c.redirect("/my/games", 303);
  });

  return r;
}
