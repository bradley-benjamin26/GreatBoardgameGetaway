import { AppError, type Db } from "../types.js";

export type TableRow = { id: number; name: string; seats: number | null };

function clean(name: string, seats: string) {
  name = name.trim();
  if (!name || name.length > 60)
    throw new AppError(400, "Enter a table name of up to 60 characters.");
  seats = seats.trim();
  if (seats === "") return { name, seats: null };
  const n = /^\d+$/.test(seats) ? Number(seats) : NaN;
  if (!(n >= 1 && n <= 99))
    throw new AppError(400, "Seats must be a whole number from 1 to 99, or left empty.");
  return { name, seats: n };
}

const unique = (e: unknown) => {
  if ((e as { code?: string }).code === "SQLITE_CONSTRAINT_UNIQUE")
    throw new AppError(409, "A table with that name already exists.");
  throw e;
};

export function createTables(db: Db) {
  const exists = (id: number) => {
    if (!db.prepare("select 1 from tables where id = ?").get(id))
      throw new AppError(404, "That table doesn't exist.");
  };
  return {
    list: () =>
      db
        .prepare("select id, name, seats from tables order by name collate nocase")
        .all() as TableRow[],

    add(userId: number, name: string, seats: string) {
      const t = clean(name, seats);
      try {
        db.prepare("insert into tables (name, seats, created_by) values (?, ?, ?)").run(
          t.name,
          t.seats,
          userId,
        );
      } catch (e) {
        unique(e);
      }
    },

    update(id: number, name: string, seats: string) {
      exists(id);
      const t = clean(name, seats);
      try {
        db.prepare("update tables set name = ?, seats = ? where id = ?").run(t.name, t.seats, id);
      } catch (e) {
        unique(e);
      }
    },

    remove(id: number) {
      exists(id);
      db.prepare("delete from tables where id = ?").run(id);
    },
    exists,
  };
}
export type Tables = ReturnType<typeof createTables>;
