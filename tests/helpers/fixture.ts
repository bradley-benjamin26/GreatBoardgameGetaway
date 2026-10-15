import type { Db } from "../../src/types.js";

let n = 0;
export function addUser(db: Db, name = `u${++n}`) {
  return Number(
    db
      .prepare(
        "insert into users (username, email, password_hash, created_at) values (?, ?, 'x', 0)",
      )
      .run(name, `${name}@example.com`).lastInsertRowid,
  );
}

export function addGame(db: Db, bringer: number, min = 2, max = 4, title = `Game ${++n}`) {
  const id = Number(
    db
      .prepare(
        "insert into games (title, min_players, max_players, play_minutes) values (?, ?, ?, 60)",
      )
      .run(title, min, max).lastInsertRowid,
  );
  db.prepare("insert into listings (user_id, game_id, owned, bringing) values (?, ?, 1, 1)").run(
    bringer,
    id,
  );
  return id;
}

export function addTable(db: Db, name = `Table ${++n}`, seats: number | null = null) {
  return Number(
    db.prepare("insert into tables (name, seats) values (?, ?)").run(name, seats).lastInsertRowid,
  );
}
