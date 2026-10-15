import Database from "better-sqlite3";
import { readdirSync, readFileSync } from "node:fs";
import type { Db } from "../types.js";

export function openDb(path: string): Db {
  const db = new Database(path);
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");
  return db;
}

const dir = new URL("./migrations/", import.meta.url);

export function migrate(db: Db): void {
  db.exec("create table if not exists schema_migrations (name text primary key)");
  const done = new Set(
    (db.prepare("select name from schema_migrations").all() as { name: string }[]).map(
      (r) => r.name,
    ),
  );
  for (const name of readdirSync(dir)
    .filter((f) => f.endsWith(".sql"))
    .sort()) {
    if (done.has(name)) continue;
    db.transaction(() => {
      db.exec(readFileSync(new URL(name, dir), "utf8"));
      db.prepare("insert into schema_migrations (name) values (?)").run(name);
    })();
  }
}
