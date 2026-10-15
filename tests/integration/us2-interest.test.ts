import { expect, it } from "vitest";
import { makeApp } from "../helpers/app.js";

it("US2: two users want the same game and both see a count of 2 with names", async () => {
  const { req, signUp, db } = makeApp();
  const alice = await signUp("alice");
  const bob = await signUp("bob");
  await req("/my/games", { form: { bggId: "13", bringing: "1" }, as: alice });
  await req("/my/games", {
    form: { title: "Solo Only", minPlayers: "1", maxPlayers: "1", playMinutes: "20", owned: "1" },
    as: alice,
  });
  const id = (db.prepare("select id from games where bgg_id = 13").get() as { id: number }).id;

  await req(`/games/${id}/interest`, { form: {}, as: alice });
  await req(`/games/${id}/interest`, { form: {}, as: bob });

  for (const s of [alice, bob]) {
    const html = await (await req("/games", { as: s })).text();
    expect(html).toContain("2 want to play");
    expect(html).toContain("alice, bob");
  }
  // a game nobody is bringing is not offered (and so cannot be wanted); the list says what is available
  expect(await (await req("/games", { as: bob })).text()).not.toContain("Solo Only");
});
