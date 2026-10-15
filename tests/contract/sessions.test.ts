import { describe, expect, it } from "vitest";
import { makeApp } from "../helpers/app.js";
import { addGame, addTable } from "../helpers/fixture.js";

async function setup(seats: number | null = 6) {
  const t = makeApp();
  const host = await t.signUp("host");
  const hostId = (
    t.db.prepare("select id from users where username = 'host'").get() as { id: number }
  ).id;
  const gameId = addGame(t.db, hostId, 2, 4);
  const tableId = addTable(t.db, "Basement table", seats);
  const form = {
    gameId: String(gameId),
    tableId: String(tableId),
    day: "2026-11-06",
    start: "19:00",
    lengthMinutes: "120",
  };
  const create = async (over: Record<string, string> = {}, as = host) => {
    const res = await t.req("/sessions", { form: { ...form, ...over }, as });
    const row = t.db.prepare("select max(id) id from play_sessions").get() as { id: number | null };
    return { res, id: row.id! };
  };
  return { ...t, host, hostId, gameId, tableId, form, create };
}

describe("POST /sessions", () => {
  it("creates a session and lists it on the schedule", async () => {
    const { create, req, host } = await setup();
    const { res } = await create();
    expect(res.status).toBe(303);
    const html = await (await req("/schedule", { as: host })).text();
    expect(html).toContain("Basement table");
    expect(html).toContain("19:00");
  });
  it("returns 409 on a same-table overlap and 400 on bad input", async () => {
    const { create } = await setup();
    await create();
    expect((await create({ start: "20:00" })).res.status).toBe(409);
    expect((await create({ start: "19:15" })).res.status).toBe(400);
    expect((await create({ lengthMinutes: "20" })).res.status).toBe(400);
    expect((await create({ day: "2030-01-01" })).res.status).toBe(400);
  });
});

describe("join, leave", () => {
  it("joins, refuses when full with 409, and leaves", async () => {
    const { create, req, signUp } = await setup(2);
    const { id } = await create();
    const a = await signUp("amy");
    const b = await signUp("ben");
    expect((await req(`/sessions/${id}/join`, { form: {}, as: a })).status).toBe(303);
    expect((await req(`/sessions/${id}/join`, { form: {}, as: b })).status).toBe(409);
    expect((await req(`/sessions/${id}/leave`, { form: {}, as: a })).status).toBe(303);
    expect((await req(`/sessions/${id}/join`, { form: {}, as: b })).status).toBe(303);
  });
  it("needs confirm=1 to join an overlapping session", async () => {
    const { create, req, signUp, db } = await setup();
    const { id: first } = await create();
    const other = addTable(db, "Porch");
    const { id: second } = await create({ tableId: String(other), start: "20:00" });
    const me = await signUp("meg");
    await req(`/sessions/${first}/join`, { form: {}, as: me });
    const warn = await req(`/sessions/${second}/join`, { form: {}, as: me });
    expect(warn.status).toBe(409);
    expect(await warn.text()).toContain("confirm");
    expect((await req(`/sessions/${second}/join`, { form: { confirm: "1" }, as: me })).status).toBe(
      303,
    );
  });
  it("404s for an unknown session", async () => {
    const { req, host } = await setup();
    expect((await req("/sessions/999/join", { form: {}, as: host })).status).toBe(404);
  });
});

describe("cancel and handover", () => {
  it("only the host may cancel; cancelled sessions show as cancelled", async () => {
    const { create, req, signUp, host } = await setup();
    const { id } = await create();
    const a = await signUp("amy");
    expect((await req(`/sessions/${id}/cancel`, { form: {}, as: a })).status).toBe(403);
    expect((await req(`/sessions/${id}/cancel`, { form: {}, as: host })).status).toBe(303);
    expect(await (await req("/schedule", { as: a })).text()).toContain("Cancelled");
  });
  it("hands over to a joined player; 403 for non-hosts; 400 for non-joined", async () => {
    const { create, req, signUp, host, db } = await setup();
    const { id } = await create();
    const a = await signUp("amy");
    const aId = (db.prepare("select id from users where username = 'amy'").get() as { id: number })
      .id;
    await req(`/sessions/${id}/join`, { form: {}, as: a });
    expect(
      (await req(`/sessions/${id}/handover`, { form: { newHostId: String(aId) }, as: a })).status,
    ).toBe(403);
    expect(
      (await req(`/sessions/${id}/handover`, { form: { newHostId: "9999" }, as: host })).status,
    ).toBe(400);
    expect(
      (await req(`/sessions/${id}/handover`, { form: { newHostId: String(aId) }, as: host }))
        .status,
    ).toBe(303);
    expect(db.prepare("select host_id from play_sessions").get()).toEqual({ host_id: aId });
  });
  it("cancels when the sole host leaves", async () => {
    const { create, req, host, db } = await setup();
    const { id } = await create();
    await req(`/sessions/${id}/leave`, { form: {}, as: host });
    expect(db.prepare("select status from play_sessions").get()).toEqual({ status: "cancelled" });
  });
});
