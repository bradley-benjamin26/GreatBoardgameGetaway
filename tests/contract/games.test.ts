import { describe, expect, it } from "vitest";
import { makeApp } from "../helpers/app.js";

const manual = { title: "Homebrew Quest", minPlayers: "2", maxPlayers: "5", playMinutes: "45" };

describe("GET /games/search", () => {
  it("lists catalog hits", async () => {
    const { req, signUp } = makeApp();
    const s = await signUp();
    const res = await req("/games/search?q=cat", { as: s });
    expect(res.status).toBe(200);
    expect(await res.text()).toContain("Catan");
  });
  it("shows a plain notice when the catalog is down and still offers manual entry", async () => {
    const { req, signUp, bgg } = makeApp();
    bgg.down = true;
    const s = await signUp();
    const html = await (await req("/games/search?q=cat", { as: s })).text();
    expect(html).toContain("Game search is unavailable");
    expect(html).toContain('name="minPlayers"');
  });
});

describe("POST /my/games", () => {
  it("adds a catalog game and stores it locally", async () => {
    const { req, signUp, db, bgg } = makeApp();
    const s = await signUp();
    expect((await req("/my/games", { form: { bggId: "13", bringing: "1" }, as: s })).status).toBe(
      303,
    );
    bgg.down = true;
    const html = await (await req("/my/games", { as: s })).text();
    expect(html).toContain("Catan");
    expect(html).toContain("3–4 players");
    expect(db.prepare("select count(*) n from games where bgg_id = 13").get()).toMatchObject({
      n: 1,
    });
  });
  it("reuses the stored copy when a second user adds the same game", async () => {
    const { req, signUp, bgg, db } = makeApp();
    const a = await signUp();
    const b = await signUp();
    await req("/my/games", { form: { bggId: "13" }, as: a });
    bgg.down = true;
    expect((await req("/my/games", { form: { bggId: "13" }, as: b })).status).toBe(303);
    expect(db.prepare("select count(*) n from games").get()).toMatchObject({ n: 1 });
  });
  it("tells the user when the catalog is down and the game is not stored", async () => {
    const { req, signUp, bgg } = makeApp();
    bgg.down = true;
    const s = await signUp();
    expect((await req("/my/games", { form: { bggId: "13" }, as: s })).status).toBe(503);
  });
  it("adds a manual game", async () => {
    const { req, signUp } = makeApp();
    const s = await signUp();
    expect((await req("/my/games", { form: manual, as: s })).status).toBe(303);
    expect(await (await req("/my/games", { as: s })).text()).toContain("Homebrew Quest");
  });
  it.each([
    ["missing title", { title: "" }],
    ["min above max", { minPlayers: "6" }],
    ["zero players", { minPlayers: "0" }],
    ["no play time", { playMinutes: "" }],
    ["non-numeric", { maxPlayers: "lots" }],
  ])("rejects a manual game with %s", async (_n, over) => {
    const { req, signUp } = makeApp();
    const s = await signUp();
    expect((await req("/my/games", { form: { ...manual, ...over }, as: s })).status).toBe(400);
  });
});

describe("POST /my/games/:gameId", () => {
  it("sets the flags and deletes the listing when both are off", async () => {
    const { req, signUp, db } = makeApp();
    const s = await signUp();
    await req("/my/games", { form: manual, as: s });
    const id = (db.prepare("select id from games").get() as { id: number }).id;
    await req(`/my/games/${id}`, { form: { bringing: "1" }, as: s });
    expect(db.prepare("select owned, bringing from listings").get()).toEqual({
      owned: 0,
      bringing: 1,
    });
    await req(`/my/games/${id}`, { form: {}, as: s });
    expect(db.prepare("select count(*) n from listings").get()).toMatchObject({ n: 0 });
  });
  it("returns 404 for a game that does not exist", async () => {
    const { req, signUp } = makeApp();
    const s = await signUp();
    expect((await req("/my/games/999", { form: { owned: "1" }, as: s })).status).toBe(404);
  });
});

describe("GET /games", () => {
  it("lists only games someone is bringing, with details and who brings them", async () => {
    const { req, signUp } = makeApp();
    const a = await signUp("alice");
    const b = await signUp("bob");
    await req("/my/games", { form: { bggId: "13", bringing: "1" }, as: a });
    await req("/my/games", { form: { ...manual, owned: "1" }, as: a });
    const html = await (await req("/games", { as: b })).text();
    expect(html).toContain("Catan");
    expect(html).toContain("3–4 players");
    expect(html).toContain("90 min");
    expect(html).toContain("alice");
    expect(html).not.toContain("Homebrew Quest");
  });
});
