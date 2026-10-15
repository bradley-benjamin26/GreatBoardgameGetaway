import type { Config } from "../config.js";
import { AppError, type Db } from "../types.js";
import { clock, overlaps, windowOf } from "./timeWindow.js";

export type SessionInput = {
  gameId: number;
  tableId: number;
  day: string;
  start: number;
  length: number;
};
export type SessionView = {
  id: number;
  gameId: number;
  gameTitle: string;
  tableId: number;
  tableName: string;
  day: string;
  startMinute: number;
  lengthMinutes: number;
  hostId: number;
  hostName: string;
  status: "scheduled" | "cancelled";
  seatLimit: number;
  players: { id: number; username: string }[];
  bringers: number;
};

type Row = {
  id: number;
  game_id: number;
  title: string;
  max_players: number;
  table_id: number;
  table_name: string;
  seats: number | null;
  day: string;
  start_minute: number;
  length_minutes: number;
  host_id: number;
  host_name: string;
  status: "scheduled" | "cancelled";
  bringers: number;
};

const SELECT = `
  select ps.id, ps.game_id, g.title, g.max_players, ps.table_id, t.name table_name, t.seats, ps.day, ps.start_minute,
         ps.length_minutes, ps.host_id, h.username host_name, ps.status,
         (select count(*) from listings l where l.game_id = ps.game_id and l.bringing = 1) bringers
  from play_sessions ps join games g on g.id = ps.game_id join tables t on t.id = ps.table_id join users h on h.id = ps.host_id`;

export function createPlaySessions({ db, config }: { db: Db; config: Config }) {
  const players = (id: number) =>
    db
      .prepare(
        "select u.id, u.username from play_session_players p join users u on u.id = p.user_id where p.play_session_id = ? order by p.rowid",
      )
      .all(id) as { id: number; username: string }[];

  const view = (r: Row): SessionView => ({
    id: r.id,
    gameId: r.game_id,
    gameTitle: r.title,
    tableId: r.table_id,
    tableName: r.table_name,
    day: r.day,
    startMinute: r.start_minute,
    lengthMinutes: r.length_minutes,
    hostId: r.host_id,
    hostName: r.host_name,
    status: r.status,
    seatLimit: Math.min(r.max_players, r.seats ?? Infinity),
    players: players(r.id),
    bringers: r.bringers,
  });

  function get(id: number): SessionView {
    const r = db.prepare(`${SELECT} where ps.id = ?`).get(id) as Row | undefined;
    if (!r) throw new AppError(404, "That session doesn't exist.");
    return view(r);
  }

  function validate(f: SessionInput) {
    if (!config.eventDays.includes(f.day)) throw new AppError(400, "Pick one of the event days.");
    if (!Number.isInteger(f.start) || f.start < 0 || f.start > 1410 || f.start % 30)
      throw new AppError(400, "Start time must be on the hour or half hour.");
    if (!Number.isInteger(f.length) || f.length < 30 || f.length > 1440 || f.length % 30)
      throw new AppError(400, "Length must be 30 minutes to 24 hours, in half-hour steps.");
    if (!db.prepare("select 1 from tables where id = ?").get(f.tableId))
      throw new AppError(400, "Pick a table.");
    if (!db.prepare("select 1 from listings where game_id = ? and bringing = 1").get(f.gameId))
      throw new AppError(400, "Pick a game that someone is bringing.");
  }

  function checkFree(f: SessionInput, ignoreId: number) {
    const mine = windowOf(f.day, f.start, f.length);
    const others = db
      .prepare(
        "select id, day, start_minute, length_minutes from play_sessions where table_id = ? and status = 'scheduled' and id != ?",
      )
      .all(f.tableId, ignoreId) as {
      id: number;
      day: string;
      start_minute: number;
      length_minutes: number;
    }[];
    const hit = others.find((o) =>
      overlaps(mine, windowOf(o.day, o.start_minute, o.length_minutes)),
    );
    if (hit)
      throw new AppError(
        409,
        `That table is already booked from ${clock(hit.start_minute)} on ${hit.day} for ${hit.length_minutes} minutes.`,
      );
  }

  const seatLimit = (gameId: number, tableId: number) => {
    const g = db.prepare("select max_players m from games where id = ?").get(gameId) as {
      m: number;
    };
    const t = db.prepare("select seats from tables where id = ?").get(tableId) as {
      seats: number | null;
    };
    return Math.min(g.m, t.seats ?? Infinity);
  };

  function asHost(userId: number, id: number) {
    const s = get(id);
    if (s.hostId !== userId) throw new AppError(403, "Only the host can do that.");
    if (s.status !== "scheduled") throw new AppError(400, "This session was cancelled.");
    return s;
  }

  const cancelRow = (id: number) =>
    db.prepare("update play_sessions set status = 'cancelled' where id = ?").run(id);

  return {
    get,

    create: db.transaction((userId: number, f: SessionInput): number => {
      validate(f);
      checkFree(f, 0);
      const id = Number(
        db
          .prepare(
            `insert into play_sessions (game_id, table_id, day, start_minute, length_minutes, host_id, created_at)
             values (?, ?, ?, ?, ?, ?, ?)`,
          )
          .run(f.gameId, f.tableId, f.day, f.start, f.length, userId, Date.now()).lastInsertRowid,
      );
      db.prepare("insert into play_session_players (play_session_id, user_id) values (?, ?)").run(
        id,
        userId,
      );
      return id;
    }),

    edit: db.transaction((userId: number, id: number, f: Omit<SessionInput, "gameId">) => {
      const s = asHost(userId, id);
      const next = { ...f, gameId: s.gameId };
      validate(next);
      checkFree(next, id);
      if (seatLimit(s.gameId, f.tableId) < s.players.length)
        throw new AppError(
          409,
          `That table has fewer seats than the ${s.players.length} players who have joined.`,
        );
      db.prepare(
        "update play_sessions set table_id = ?, day = ?, start_minute = ?, length_minutes = ? where id = ?",
      ).run(f.tableId, f.day, f.start, f.length, id);
    }),

    join: db.transaction((userId: number, id: number, confirm: boolean): { warning?: string } => {
      const s = get(id);
      if (s.status !== "scheduled") throw new AppError(400, "This session was cancelled.");
      if (s.players.some((p) => p.id === userId)) return {};
      if (s.players.length >= s.seatLimit) throw new AppError(409, "This session is full.");
      if (!confirm) {
        const mine = windowOf(s.day, s.startMinute, s.lengthMinutes);
        const clash = (
          db
            .prepare(
              `${SELECT} join play_session_players me on me.play_session_id = ps.id and me.user_id = ?
               where ps.status = 'scheduled' and ps.id != ?`,
            )
            .all(userId, id) as Row[]
        ).find((o) => overlaps(mine, windowOf(o.day, o.start_minute, o.length_minutes)));
        if (clash)
          return {
            warning: `You have already joined ${clash.title} at ${clock(clash.start_minute)} on ${clash.day}, which overlaps this session.`,
          };
      }
      db.prepare("insert into play_session_players (play_session_id, user_id) values (?, ?)").run(
        id,
        userId,
      );
      return {};
    }),

    leave: db.transaction((userId: number, id: number) => {
      const s = get(id);
      if (s.status !== "scheduled") throw new AppError(400, "This session was cancelled.");
      if (!s.players.some((p) => p.id === userId))
        throw new AppError(400, "You haven't joined this session.");
      if (s.hostId === userId) {
        if (s.players.length > 1)
          throw new AppError(400, "Choose a new host before you leave, or cancel the session.");
        cancelRow(id);
        return;
      }
      db.prepare("delete from play_session_players where play_session_id = ? and user_id = ?").run(
        id,
        userId,
      );
    }),

    cancel: db.transaction((userId: number, id: number) => {
      asHost(userId, id);
      cancelRow(id);
    }),

    handover: db.transaction((userId: number, id: number, newHostId: number) => {
      const s = asHost(userId, id);
      if (s.players.length === 1) {
        cancelRow(id);
        return;
      }
      if (newHostId === userId || !s.players.some((p) => p.id === newHostId))
        throw new AppError(400, "Pick another player who has joined.");
      db.prepare("update play_sessions set host_id = ? where id = ?").run(newHostId, id);
      db.prepare("delete from play_session_players where play_session_id = ? and user_id = ?").run(
        id,
        userId,
      );
    }),

    list(): SessionView[] {
      return (db.prepare(`${SELECT} order by ps.day, ps.start_minute, ps.id`).all() as Row[]).map(
        view,
      );
    },

    scheduledAtTable: (tableId: number) =>
      (
        db
          .prepare(
            "select count(*) n from play_sessions where table_id = ? and status = 'scheduled'",
          )
          .get(tableId) as { n: number }
      ).n,
  };
}
export type PlaySessions = ReturnType<typeof createPlaySessions>;
