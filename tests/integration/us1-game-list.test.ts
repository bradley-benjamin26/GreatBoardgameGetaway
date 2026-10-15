import { expect, it } from "vitest";
import { makeApp } from "../helpers/app.js";

it("US1: a new user builds a game list from search and by hand", async () => {
  const { req, signUp, bgg } = makeApp();
  const s = await signUp("alice");

  expect(await (await req("/games/search?q=catan", { as: s })).text()).toContain("Catan");
  await req("/my/games", { form: { bggId: "13", bringing: "1", owned: "1" }, as: s });
  await req("/my/games", {
    form: { title: "Homebrew", minPlayers: "2", maxPlayers: "4", playMinutes: "30", owned: "1" },
    as: s,
  });

  const mine = await (await req("/my/games", { as: s })).text();
  expect(mine).toContain("Catan");
  expect(mine).toContain("Homebrew");

  const shared = await (await req("/games", { as: s })).text();
  expect(shared).toContain("Catan");
  expect(shared).not.toContain("Homebrew");

  // FR-012 / SC-005: with the catalog down, search says so and manual entry still works
  bgg.down = true;
  expect(await (await req("/games/search?q=catan", { as: s })).text()).toContain(
    "Game search is unavailable",
  );
  const added = await req("/my/games", {
    form: { title: "Offline Game", minPlayers: "1", maxPlayers: "2", playMinutes: "20" },
    as: s,
  });
  expect(added.status).toBe(303);
  expect(await (await req("/my/games", { as: s })).text()).toContain("Offline Game");
});
