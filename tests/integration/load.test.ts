import { expect, it } from "vitest";
import { makeApp } from "../helpers/app.js";

it("SC-006: 20 users sign up, browse and join in parallel without slowdown", async () => {
  const { req, signUp, db } = makeApp();
  const host = await signUp("hosty");
  await req("/my/games", {
    form: { title: "Party", minPlayers: "2", maxPlayers: "30", playMinutes: "30", bringing: "1" },
    as: host,
  });
  await req("/tables", { form: { name: "Big table", seats: "30" }, as: host });
  const gameId = (db.prepare("select id from games").get() as { id: number }).id;
  const tableId = (db.prepare("select id from tables").get() as { id: number }).id;
  await req("/sessions", {
    form: {
      gameId: String(gameId),
      tableId: String(tableId),
      day: "2026-11-06",
      start: "19:00",
      lengthMinutes: "60",
    },
    as: host,
  });
  const sessionId = (db.prepare("select id from play_sessions").get() as { id: number }).id;

  const times: number[] = [];
  const statuses: number[] = [];
  const timed = async (p: Promise<Response>) => {
    const t0 = performance.now();
    const res = await p;
    times.push(performance.now() - t0);
    statuses.push(res.status);
    return res;
  };

  await Promise.all(
    Array.from({ length: 20 }, async (_, i) => {
      const name = `load${String(i).padStart(2, "0")}`;
      const res = await timed(
        req("/signup", {
          form: {
            username: name,
            email: `${name}@example.com`,
            password: "correct horse battery",
            eventCode: "testcode",
          },
        }),
      );
      const cookie = res.headers.get("set-cookie")!.split(";")[0];
      const page = await (
        await req("/games", { as: { username: name, email: "", cookie, csrf: "" } })
      ).text();
      const csrf = /name="_csrf" value="([^"]+)"/.exec(page)![1];
      const as = { username: name, email: "", cookie, csrf };
      await timed(req("/games", { as }));
      await timed(req("/schedule", { as }));
      await timed(req(`/sessions/${sessionId}/join`, { form: {}, as }));
    }),
  );

  expect(statuses.every((s) => s === 200 || s === 303)).toBe(true);
  const sorted = [...times].sort((a, b) => a - b);
  expect(sorted[Math.floor(sorted.length * 0.95)]).toBeLessThan(1000);
  expect(db.prepare("select count(*) n from play_session_players").get()).toMatchObject({ n: 21 });
});
