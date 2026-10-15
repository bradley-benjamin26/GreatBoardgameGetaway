import { AppError, type Catalog, type Db } from "../types.js";

export type Flags = { owned: boolean; bringing: boolean };
export type GameRow = {
  id: number;
  title: string;
  min_players: number;
  max_players: number;
  play_minutes: number;
  image_url: string | null;
};
export type Listing = GameRow & Flags;
export type BroughtGame = GameRow & {
  bringers: string;
  wanters: string | null;
  wanted: number;
  iWant: number;
};

const int = (v: string, lo: number, hi: number, what: string) => {
  const n = /^\d+$/.test(v) ? Number(v) : NaN;
  if (!(n >= lo && n <= hi))
    throw new AppError(400, `${what} must be a whole number from ${lo} to ${hi}.`);
  return n;
};

export function createGames({ db, bgg }: { db: Db; bgg: Catalog }) {
  function setFlags(userId: number, gameId: number, f: Flags) {
    if (!db.prepare("select 1 from games where id = ?").get(gameId))
      throw new AppError(404, "That game doesn't exist.");
    if (!f.owned && !f.bringing) {
      db.prepare("delete from listings where user_id = ? and game_id = ?").run(userId, gameId);
      return;
    }
    db.prepare(
      `insert into listings (user_id, game_id, owned, bringing) values (?, ?, ?, ?)
       on conflict (user_id, game_id) do update set owned = excluded.owned, bringing = excluded.bringing`,
    ).run(userId, gameId, +f.owned, +f.bringing);
  }
  // adding a game with no box ticked means "I own it"
  const withDefault = (f: Flags): Flags =>
    f.owned || f.bringing ? f : { owned: true, bringing: false };

  return {
    search: (q: string) => bgg.search(q),

    async addFromBgg(userId: number, bggId: number, flags: Flags) {
      let row = db.prepare("select id from games where bgg_id = ?").get(bggId) as
        { id: number } | undefined;
      if (!row) {
        const g = await bgg.getGame(bggId);
        const info = db
          .prepare(
            `insert into games (title, min_players, max_players, play_minutes, image_url, bgg_id, fetched_at)
             values (?, ?, ?, ?, ?, ?, ?)`,
          )
          .run(
            g.title,
            g.minPlayers,
            g.maxPlayers,
            g.playMinutes,
            g.imageUrl ?? null,
            g.bggId,
            Date.now(),
          );
        row = { id: Number(info.lastInsertRowid) };
      }
      setFlags(userId, row.id, withDefault(flags));
    },

    addManual(userId: number, f: Record<string, string>, flags: Flags) {
      const title = (f.title ?? "").trim();
      if (!title || title.length > 100)
        throw new AppError(400, "Enter a title of up to 100 characters.");
      const min = int(f.minPlayers ?? "", 1, 99, "Minimum players");
      const max = int(f.maxPlayers ?? "", 1, 99, "Maximum players");
      if (min > max) throw new AppError(400, "Minimum players can't be more than maximum players.");
      const play = int(f.playMinutes ?? "", 1, 1440, "Play time");
      const info = db
        .prepare(
          "insert into games (title, min_players, max_players, play_minutes, created_by) values (?, ?, ?, ?, ?)",
        )
        .run(title, min, max, play, userId);
      setFlags(userId, Number(info.lastInsertRowid), withDefault(flags));
    },

    setFlags,

    myListings(userId: number): Listing[] {
      return db
        .prepare(
          `select g.*, l.owned, l.bringing from listings l join games g on g.id = l.game_id
           where l.user_id = ? order by g.title collate nocase`,
        )
        .all(userId)
        .map((r) => ({
          ...(r as Listing),
          owned: !!(r as Listing).owned,
          bringing: !!(r as Listing).bringing,
        }));
    },

    broughtGames(userId: number): BroughtGame[] {
      return db
        .prepare(
          `select g.*,
             (select group_concat(u.username, ', ') from listings l join users u on u.id = l.user_id
               where l.game_id = g.id and l.bringing = 1) bringers,
             (select group_concat(username, ', ') from (
               select u.username from interest i join users u on u.id = i.user_id where i.game_id = g.id order by u.username collate nocase)) wanters,
             (select count(*) from interest i where i.game_id = g.id) wanted,
             (select count(*) from interest i where i.game_id = g.id and i.user_id = ?) iWant
           from games g where exists (select 1 from listings l where l.game_id = g.id and l.bringing = 1)
           order by g.title collate nocase`,
        )
        .all(userId) as BroughtGame[];
    },

    setInterest(userId: number, gameId: number, want: boolean) {
      if (!db.prepare("select 1 from games where id = ?").get(gameId))
        throw new AppError(404, "That game doesn't exist.");
      if (want)
        db.prepare("insert or ignore into interest (user_id, game_id) values (?, ?)").run(
          userId,
          gameId,
        );
      else db.prepare("delete from interest where user_id = ? and game_id = ?").run(userId, gameId);
    },
  };
}
export type Games = ReturnType<typeof createGames>;
