import { expect, it } from "vitest";
import { makeApp } from "../helpers/app.js";

it("US4: four players fill a 2-4 player game, a fifth and a double-booking are refused", async () => {
  const { req, signUp, db } = makeApp();
  const host = await signUp("host");
  await req("/my/games", {
    form: { title: "Quest", minPlayers: "2", maxPlayers: "4", playMinutes: "60", bringing: "1" },
    as: host,
  });
  await req("/tables", { form: { name: "Basement table", seats: "6" }, as: host });
  const gameId = (db.prepare("select id from games").get() as { id: number }).id;
  const tableId = (db.prepare("select id from tables").get() as { id: number }).id;
  const form = {
    gameId: String(gameId),
    tableId: String(tableId),
    day: "2026-11-06",
    start: "19:00",
    lengthMinutes: "90",
  };

  expect((await req("/sessions", { form, as: host })).status).toBe(303);
  const id = (db.prepare("select id from play_sessions").get() as { id: number }).id;
  const players = [
    await signUp("pl1"),
    await signUp("pl2"),
    await signUp("pl3"),
    await signUp("pl4"),
  ];
  for (const p of players.slice(0, 3))
    expect((await req(`/sessions/${id}/join`, { form: {}, as: p })).status).toBe(303);
  expect((await req(`/sessions/${id}/join`, { form: {}, as: players[3] })).status).toBe(409);
  expect((await req("/sessions", { form: { ...form, start: "19:30" }, as: host })).status).toBe(
    409,
  );
  const html = await (await req("/schedule", { as: host })).text();
  expect(html).toContain("0 seats left");
});

it("US4: two people racing for the last seat - exactly one gets it", async () => {
  const { req, signUp, db } = makeApp();
  const host = await signUp("host");
  await req("/my/games", {
    form: { title: "Duel", minPlayers: "2", maxPlayers: "2", playMinutes: "30", bringing: "1" },
    as: host,
  });
  await req("/tables", { form: { name: "Porch", seats: "" }, as: host });
  const gameId = (db.prepare("select id from games").get() as { id: number }).id;
  const tableId = (db.prepare("select id from tables").get() as { id: number }).id;
  await req("/sessions", {
    form: {
      gameId: String(gameId),
      tableId: String(tableId),
      day: "2026-11-07",
      start: "10:00",
      lengthMinutes: "60",
    },
    as: host,
  });
  const id = (db.prepare("select id from play_sessions").get() as { id: number }).id;
  const [a, b] = [await signUp("amy"), await signUp("ben")];
  const results = await Promise.all([
    req(`/sessions/${id}/join`, { form: {}, as: a }),
    req(`/sessions/${id}/join`, { form: {}, as: b }),
  ]);
  expect(results.map((r) => r.status).sort()).toEqual([303, 409]);
  expect(db.prepare("select count(*) n from play_session_players").get()).toMatchObject({ n: 2 });
});

it("US4: removing a table with scheduled sessions warns first and removes them on confirm", async () => {
  const { req, signUp, db } = makeApp();
  const host = await signUp("host");
  await req("/my/games", {
    form: { title: "Quest", minPlayers: "2", maxPlayers: "4", playMinutes: "60", bringing: "1" },
    as: host,
  });
  await req("/tables", { form: { name: "Porch", seats: "" }, as: host });
  const gameId = (db.prepare("select id from games").get() as { id: number }).id;
  const tableId = (db.prepare("select id from tables").get() as { id: number }).id;
  await req("/sessions", {
    form: {
      gameId: String(gameId),
      tableId: String(tableId),
      day: "2026-11-07",
      start: "10:00",
      lengthMinutes: "60",
    },
    as: host,
  });

  const warn = await req(`/tables/${tableId}/delete`, { form: {}, as: host });
  expect(warn.status).toBe(409);
  expect(await warn.text()).toContain("1 scheduled");
  expect(db.prepare("select count(*) n from tables").get()).toMatchObject({ n: 1 });

  expect(
    (await req(`/tables/${tableId}/delete`, { form: { confirm: "1" }, as: host })).status,
  ).toBe(303);
  expect(db.prepare("select count(*) n from tables").get()).toMatchObject({ n: 0 });
  expect(db.prepare("select count(*) n from play_sessions").get()).toMatchObject({ n: 0 });
});
