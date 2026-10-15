import { Hono, type Context } from "hono";
import type { Env } from "../app.js";
import type { Config } from "../config.js";
import type { Games } from "../services/games.js";
import type { PlaySessions } from "../services/playSessions.js";
import type { Tables } from "../services/tables.js";
import { AppError } from "../types.js";
import { JoinWarning, Schedule, SessionEdit } from "../views/schedule.js";

const num = (v: unknown) => (typeof v === "string" && /^-?\d+$/.test(v.trim()) ? Number(v) : NaN);
const startMinutes = (v: unknown) => {
  const m = typeof v === "string" ? /^(\d{2}):(\d{2})$/.exec(v) : null;
  return m ? Number(m[1]) * 60 + Number(m[2]) : NaN;
};

export function sessionRoutes(ps: PlaySessions, games: Games, tables: Tables, config: Config) {
  const r = new Hono<Env>();
  const page = (c: Context<Env>) => ({ user: c.get("user"), csrf: c.get("csrf") });
  const me = (c: Context<Env>) => c.get("user")!.id;
  const id = (c: Context<Env>) => Number(c.req.param("id"));
  const schedule = (c: Context<Env>, extra: object = {}) => (
    <Schedule
      {...page(c)}
      me={me(c)}
      sessions={ps.list()}
      days={config.eventDays}
      games={games.broughtGames(me(c))}
      tables={tables.list()}
      {...extra}
    />
  );
  const when = (b: Record<string, unknown>) => ({
    tableId: num(b.tableId),
    day: String(b.day ?? ""),
    start: startMinutes(b.start),
    length: num(b.lengthMinutes),
  });

  r.get("/schedule", (c) => c.html(schedule(c)));

  r.post("/sessions", async (c) => {
    const b = await c.req.parseBody();
    const f = { gameId: num(b.gameId), ...when(b) };
    try {
      ps.create(me(c), f);
      return c.redirect("/schedule", 303);
    } catch (e) {
      if (!(e instanceof AppError)) throw e;
      return c.html(schedule(c, { error: e.message, v: f }), e.status as 400);
    }
  });

  r.get("/sessions/:id/edit", (c) => {
    const s = ps.get(id(c));
    if (s.hostId !== me(c)) throw new AppError(403, "Only the host can do that.");
    return c.html(
      <SessionEdit {...page(c)} s={s} days={config.eventDays} tables={tables.list()} />,
    );
  });
  r.post("/sessions/:id/edit", async (c) => {
    const f = when(await c.req.parseBody());
    try {
      ps.edit(me(c), id(c), f);
      return c.redirect("/schedule", 303);
    } catch (e) {
      if (!(e instanceof AppError) || e.status === 403 || e.status === 404) throw e;
      return c.html(
        <SessionEdit
          {...page(c)}
          s={ps.get(id(c))}
          days={config.eventDays}
          tables={tables.list()}
          error={e.message}
        />,
        e.status as 400,
      );
    }
  });

  r.post("/sessions/:id/join", async (c) => {
    const { warning } = ps.join(me(c), id(c), (await c.req.parseBody()).confirm === "1");
    if (warning) return c.html(<JoinWarning {...page(c)} id={id(c)} warning={warning} />, 409);
    return c.redirect("/schedule", 303);
  });
  r.post("/sessions/:id/leave", (c) => (ps.leave(me(c), id(c)), c.redirect("/schedule", 303)));
  r.post("/sessions/:id/cancel", (c) => (ps.cancel(me(c), id(c)), c.redirect("/schedule", 303)));
  r.post("/sessions/:id/handover", async (c) => {
    ps.handover(me(c), id(c), num((await c.req.parseBody()).newHostId));
    return c.redirect("/schedule", 303);
  });

  return r;
}
