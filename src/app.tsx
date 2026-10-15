import { createHmac, timingSafeEqual } from "node:crypto";
import { Hono } from "hono";
import { getCookie } from "hono/cookie";
import { compress } from "hono/compress";
import { serveStatic } from "@hono/node-server/serve-static";
import type { Config } from "./config.js";
import { createAuth, type User } from "./services/auth.js";
import { AppError, type Catalog, type Db, type Mailer } from "./types.js";
import { SESSION_COOKIE, authRoutes } from "./routes/auth.js";
import { createGames } from "./services/games.js";
import { gameRoutes } from "./routes/games.js";
import { createTables } from "./services/tables.js";
import { tableRoutes } from "./routes/tables.js";
import { createPlaySessions } from "./services/playSessions.js";
import { sessionRoutes } from "./routes/sessions.js";
import { Home, Message } from "./views/home.js";

export type Deps = { db: Db; config: Config; mailer: Mailer; bgg: Catalog };
export type Env = { Variables: { user?: User; token?: string; csrf?: string } };

const PUBLIC = /^\/(signup|signin|reset(\/[^/]+)?|static\/.*)$/;
const RATE_WINDOW = 15 * 60_000;
const RATE_MAX = 30;

export function createApp(deps: Deps) {
  const { config } = deps;
  const auth = createAuth(deps);
  const app = new Hono<Env>();
  const attempts = new Map<string, number[]>();

  app.use(compress());
  app.use("/static/*", async (c, next) => {
    await next();
    c.header("Cache-Control", "public, max-age=3600");
  });
  app.use(
    "/static/*",
    serveStatic({ root: "./src/public", rewriteRequestPath: (p) => p.replace(/^\/static/, "") }),
  );

  app.use("*", async (c, next) => {
    c.header(
      "Content-Security-Policy",
      "default-src 'self'; img-src 'self' https:; frame-ancestors 'none'",
    );
    c.header("X-Content-Type-Options", "nosniff");
    c.header("Referrer-Policy", "same-origin");
    await next();
    if (!c.res.headers.has("Cache-Control")) c.header("Cache-Control", "private, no-cache");
  });

  // shortcut: trusts X-Forwarded-For and keeps counts in memory, fine for one process behind a proxy; use a shared store if scaled out
  app.use("*", async (c, next) => {
    if (c.req.method !== "POST" || !PUBLIC.test(c.req.path)) return next();
    const ip = c.req.header("x-forwarded-for")?.split(",")[0].trim() ?? "local";
    const now = Date.now();
    const recent = (attempts.get(ip) ?? []).filter((t) => now - t < RATE_WINDOW);
    recent.push(now);
    attempts.set(ip, recent);
    if (recent.length > RATE_MAX)
      return c.html(
        <Message title="Slow down" text="Too many attempts. Try again in a few minutes." />,
        429,
      );
    return next();
  });

  app.use("*", async (c, next) => {
    const token = getCookie(c, SESSION_COOKIE);
    const user = token ? auth.userForToken(token) : undefined;
    if (token && user) {
      c.set("user", user);
      c.set("token", token);
      c.set("csrf", createHmac("sha256", config.sessionSecret).update(token).digest("hex"));
    }
    if (PUBLIC.test(c.req.path)) return next();
    if (!user) return c.redirect("/signin", 303);
    if (c.req.method !== "GET" && c.req.method !== "HEAD") {
      const sent = String((await c.req.parseBody())._csrf ?? "");
      const want = c.get("csrf") ?? "";
      if (sent.length !== want.length || !timingSafeEqual(Buffer.from(sent), Buffer.from(want))) {
        return c.html(
          <Message
            title="Not allowed"
            text="Your session looks out of date. Go back, reload the page and try again."
            user={user}
            csrf={want}
          />,
          403,
        );
      }
    }
    return next();
  });

  app.route("/", authRoutes(auth, config.cookieSecure));
  const games = createGames(deps);
  const tables = createTables(deps.db);
  const sessions = createPlaySessions(deps);
  app.route("/", gameRoutes(games));
  app.route("/", tableRoutes(tables, sessions));
  app.route("/", sessionRoutes(sessions, games, tables, config));
  app.get("/", (c) => c.html(<Home user={c.get("user")} csrf={c.get("csrf")} />));

  app.notFound((c) =>
    c.html(
      <Message
        title="Not found"
        text="That page doesn't exist."
        user={c.get("user")}
        csrf={c.get("csrf")}
      />,
      404,
    ),
  );
  app.onError((e, c) => {
    if (e instanceof AppError)
      return c.html(
        <Message title="Problem" text={e.message} user={c.get("user")} csrf={c.get("csrf")} />,
        e.status as 400,
      );
    console.error(e);
    return c.html(
      <Message
        title="Something went wrong"
        text="Please try again."
        user={c.get("user")}
        csrf={c.get("csrf")}
      />,
      500,
    );
  });

  return app;
}
