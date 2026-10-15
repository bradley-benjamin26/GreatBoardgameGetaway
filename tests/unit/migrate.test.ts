import { describe, expect, it } from "vitest";
import { migrate, openDb } from "../../src/db/index.js";

describe("migrate", () => {
  it("creates the users table and is safe to run twice", () => {
    const db = openDb(":memory:");
    migrate(db);
    migrate(db);
    const cols = db.prepare("pragma table_info(users)").all() as { name: string }[];
    expect(cols.map((c) => c.name)).toEqual(
      expect.arrayContaining(["username", "email", "password_hash"]),
    );
    expect(db.prepare("select count(*) n from schema_migrations").get()).toMatchObject({
      n: expect.any(Number),
    });
  });
});
