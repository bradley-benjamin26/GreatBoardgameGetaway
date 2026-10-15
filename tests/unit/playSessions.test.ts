import { beforeEach, describe, expect, it } from "vitest";
import { createPlaySessions } from "../../src/services/playSessions.js";
import { overlaps, windowOf } from "../../src/services/timeWindow.js";
import { addGame, addTable, addUser } from "../helpers/fixture.js";
import { makeApp } from "../helpers/app.js";

const D1 = "2026-11-06";
const D2 = "2026-11-07";

describe("time windows", () => {
  it("adjacent windows do not overlap, crossing ones do", () => {
    expect(overlaps(windowOf(D1, 600, 60), windowOf(D1, 660, 60))).toBe(false);
    expect(overlaps(windowOf(D1, 600, 90), windowOf(D1, 660, 60))).toBe(true);
  });
  it("a session at 22:00 for 3 hours blocks 00:30 on the next day but not 01:00", () => {
    const late = windowOf(D1, 22 * 60, 180);
    expect(overlaps(late, windowOf(D2, 30, 30))).toBe(true);
    expect(overlaps(late, windowOf(D2, 60, 30))).toBe(false);
  });
});

describe("play session rules", () => {
  let t: ReturnType<typeof makeApp>;
  let ps: ReturnType<typeof createPlaySessions>;
  let host: number, game: number, table: number;
  const base = () => ({ gameId: game, tableId: table, day: D1, start: 600, length: 60 });

  beforeEach(() => {
    t = makeApp();
    ps = createPlaySessions({ db: t.db, config: t.config });
    host = addUser(t.db);
    game = addGame(t.db, host, 2, 4);
    table = addTable(t.db, undefined, 6);
  });

  it("creates a session with the host seated", () => {
    const id = ps.create(host, base());
    expect(ps.get(id)).toMatchObject({
      hostId: host,
      status: "scheduled",
      seatLimit: 4,
      players: [{ id: host }],
    });
  });

  it.each([
    ["start not a multiple of 30", { start: 610 }],
    ["start below 0", { start: -30 }],
    ["start above 1410", { start: 1440 }],
    ["length not a multiple of 30", { length: 45 }],
    ["length below 30", { length: 0 }],
    ["length above 1440", { length: 1470 }],
    ["day not in the event", { day: "2026-12-25" }],
  ])("refuses %s", (_n, over) => {
    expect(() => ps.create(host, { ...base(), ...over })).toThrowError(
      expect.objectContaining({ status: 400 }),
    );
  });

  it("allows a 24-hour session and one that ends the next day", () => {
    expect(() => ps.create(host, { ...base(), start: 22 * 60, length: 180 })).not.toThrow();
    const other = addTable(t.db);
    expect(() =>
      ps.create(host, { ...base(), tableId: other, start: 0, length: 1440 }),
    ).not.toThrow();
  });

  it("refuses a game nobody is bringing", () => {
    const nobody = Number(
      t.db
        .prepare(
          "insert into games (title, min_players, max_players, play_minutes) values ('Z', 1, 2, 10)",
        )
        .run().lastInsertRowid,
    );
    expect(() => ps.create(host, { ...base(), gameId: nobody })).toThrowError(
      expect.objectContaining({ status: 400 }),
    );
  });

  it("refuses a same-table overlap, including across midnight, but allows back-to-back", () => {
    ps.create(host, { ...base(), start: 22 * 60, length: 180 });
    expect(() => ps.create(host, { ...base(), day: D2, start: 30, length: 30 })).toThrowError(
      expect.objectContaining({ status: 409 }),
    );
    expect(() => ps.create(host, { ...base(), day: D2, start: 60, length: 30 })).not.toThrow();
  });

  it("uses the smaller of the game's max players and the table's seats", () => {
    const small = addTable(t.db, undefined, 3);
    expect(ps.get(ps.create(host, { ...base(), tableId: small })).seatLimit).toBe(3);
    const big = addGame(t.db, host, 1, 8);
    expect(ps.get(ps.create(host, { ...base(), gameId: big, start: 900 })).seatLimit).toBe(6);
  });

  it("refuses joins when full and the seat count never exceeds the limit", () => {
    const id = ps.create(host, { ...base(), tableId: addTable(t.db, undefined, 2) });
    ps.join(addUser(t.db), id, false);
    expect(() => ps.join(addUser(t.db), id, false)).toThrowError(
      expect.objectContaining({ status: 409 }),
    );
    expect(ps.get(id).players).toHaveLength(2);
  });

  it("warns on joining an overlapping session and joins on confirm", () => {
    const a = ps.create(host, base());
    const b = ps.create(addUser(t.db), { ...base(), tableId: addTable(t.db), start: 630 });
    const me = addUser(t.db);
    ps.join(me, a, false);
    expect(ps.join(me, b, false).warning).toBeTruthy();
    expect(ps.get(b).players.map((p) => p.id)).not.toContain(me);
    expect(ps.join(me, b, true).warning).toBeUndefined();
    expect(ps.get(b).players.map((p) => p.id)).toContain(me);
  });

  it("editing ignores the session itself, re-checks overlap, and keeps seats >= players", () => {
    const id = ps.create(host, base());
    ps.edit(host, id, { tableId: table, day: D1, start: 630, length: 60 });
    expect(ps.get(id).startMinute).toBe(630);
    const other = ps.create(host, { ...base(), start: 900 });
    expect(() =>
      ps.edit(host, other, { tableId: table, day: D1, start: 630, length: 60 }),
    ).toThrowError(expect.objectContaining({ status: 409 }));
    ps.join(addUser(t.db), id, false);
    ps.join(addUser(t.db), id, false);
    const tiny = addTable(t.db, undefined, 2);
    expect(() =>
      ps.edit(host, id, { tableId: tiny, day: D1, start: 630, length: 60 }),
    ).toThrowError(expect.objectContaining({ status: 409 }));
  });

  it("only the host may edit, cancel or hand over", () => {
    const id = ps.create(host, base());
    const other = addUser(t.db);
    ps.join(other, id, false);
    expect(() => ps.cancel(other, id)).toThrowError(expect.objectContaining({ status: 403 }));
    expect(() => ps.handover(other, id, other)).toThrowError(
      expect.objectContaining({ status: 403 }),
    );
    expect(() =>
      ps.edit(other, id, { tableId: table, day: D1, start: 600, length: 60 }),
    ).toThrowError(expect.objectContaining({ status: 403 }));
  });

  it("host handover moves hosting and removes the old host; sole host leaving cancels", () => {
    const id = ps.create(host, base());
    const p = addUser(t.db);
    ps.join(p, id, false);
    ps.handover(host, id, p);
    expect(ps.get(id)).toMatchObject({ hostId: p, status: "scheduled" });
    expect(ps.get(id).players.map((x) => x.id)).toEqual([p]);
    ps.leave(p, id);
    expect(ps.get(id).status).toBe("cancelled");
  });

  it("refuses handover to someone who has not joined", () => {
    const id = ps.create(host, base());
    ps.join(addUser(t.db), id, false);
    expect(() => ps.handover(host, id, addUser(t.db))).toThrowError(
      expect.objectContaining({ status: 400 }),
    );
  });

  it("a host with others joined must hand over rather than just leave", () => {
    const id = ps.create(host, base());
    ps.join(addUser(t.db), id, false);
    expect(() => ps.leave(host, id)).toThrowError(expect.objectContaining({ status: 400 }));
  });

  it("cancelled sessions free the slot", () => {
    const id = ps.create(host, base());
    ps.cancel(host, id);
    expect(() => ps.create(host, base())).not.toThrow();
  });
});
