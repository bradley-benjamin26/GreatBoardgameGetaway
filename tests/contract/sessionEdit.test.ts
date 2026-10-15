import { describe, expect, it } from "vitest";
import { makeApp } from "../helpers/app.js";
import { addGame, addTable } from "../helpers/fixture.js";

async function setup() {
  const t = makeApp();
  const host = await t.signUp("host");
  const hostId = (
    t.db.prepare("select id from users where username = 'host'").get() as { id: number }
  ).id;
  const gameId = addGame(t.db, hostId, 2, 4);
  const tableId = addTable(t.db, "Basement table", 6);
  await t.req("/sessions", {
    form: {
      gameId: String(gameId),
      tableId: String(tableId),
      day: "2026-11-06",
      start: "19:00",
      lengthMinutes: "120",
    },
    as: host,
  });
  const id = (t.db.prepare("select id from play_sessions").get() as { id: number }).id;
  const edit = (over: Record<string, string>, as = host) =>
    t.req(`/sessions/${id}/edit`, {
      form: {
        tableId: String(tableId),
        day: "2026-11-06",
        start: "19:00",
        lengthMinutes: "120",
        ...over,
      },
      as,
    });
  return { ...t, host, id, tableId, edit };
}

describe("POST /sessions/:id/edit", () => {
  it("lets the host change the time and shows it to joined players", async () => {
    const { edit, req, signUp, id } = await setup();
    const p = await signUp("pam");
    await req(`/sessions/${id}/join`, { form: {}, as: p });
    expect((await edit({ start: "21:30", lengthMinutes: "60" })).status).toBe(303);
    expect(await (await req("/schedule", { as: p })).text()).toContain("21:30");
  });
  it("refuses non-hosts with 403", async () => {
    const { edit, signUp } = await setup();
    expect((await edit({ start: "20:00" }, await signUp("pam"))).status).toBe(403);
  });
  it("refuses a change that double-books the table with 409, but not one that only overlaps itself", async () => {
    const { edit, req, host, db, tableId } = await setup();
    const gameId = (db.prepare("select id from games").get() as { id: number }).id;
    await req("/sessions", {
      form: {
        gameId: String(gameId),
        tableId: String(tableId),
        day: "2026-11-06",
        start: "12:00",
        lengthMinutes: "60",
      },
      as: host,
    });
    expect((await edit({ start: "19:30" })).status).toBe(303);
    expect((await edit({ start: "12:30" })).status).toBe(409);
  });
  it("refuses a table with fewer seats than players joined with 409", async () => {
    const { edit, req, signUp, id, db } = await setup();
    for (const n of ["amy", "ben"])
      await req(`/sessions/${id}/join`, { form: {}, as: await signUp(n) });
    const tiny = addTable(db, "Tiny", 2);
    expect((await edit({ tableId: String(tiny) })).status).toBe(409);
  });
  it("404s for an unknown session", async () => {
    const { req, host } = await setup();
    expect(
      (
        await req("/sessions/999/edit", {
          form: { tableId: "1", day: "2026-11-06", start: "10:00", lengthMinutes: "60" },
          as: host,
        })
      ).status,
    ).toBe(404);
  });
});
