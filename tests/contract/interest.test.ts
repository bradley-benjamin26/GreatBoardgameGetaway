import { describe, expect, it } from "vitest";
import { makeApp } from "../helpers/app.js";

async function setup() {
  const t = makeApp();
  const alice = await t.signUp("alice");
  const bob = await t.signUp("bob");
  await t.req("/my/games", { form: { bggId: "13", bringing: "1" }, as: alice });
  const id = (t.db.prepare("select id from games").get() as { id: number }).id;
  return { ...t, alice, bob, id };
}

describe("interest", () => {
  it("marking raises the count by one and unmarking lowers it", async () => {
    const { req, alice, bob, id } = await setup();
    expect((await req(`/games/${id}/interest`, { form: {}, as: alice })).status).toBe(303);
    expect(await (await req("/games", { as: bob })).text()).toContain("1 want to play");
    await req(`/games/${id}/interest`, { form: {}, as: bob });
    expect(await (await req("/games", { as: bob })).text()).toContain("2 want to play");
    expect(
      (await req(`/games/${id}/interest`, { method: "DELETE", form: {}, as: bob })).status,
    ).toBe(303);
    expect(await (await req("/games", { as: alice })).text()).toContain("1 want to play");
  });

  it("marking twice does not double count", async () => {
    const { req, db, alice, id } = await setup();
    await req(`/games/${id}/interest`, { form: {}, as: alice });
    await req(`/games/${id}/interest`, { form: {}, as: alice });
    expect(db.prepare("select count(*) n from interest").get()).toMatchObject({ n: 1 });
  });

  it("returns 404 for an unknown game", async () => {
    const { req, alice } = await setup();
    expect((await req("/games/999/interest", { form: {}, as: alice })).status).toBe(404);
  });
});

it("a plain form can remove interest with _method=DELETE", async () => {
  const { req, alice, id, db } = await setup();
  await req(`/games/${id}/interest`, { form: {}, as: alice });
  await req(`/games/${id}/interest`, { form: { _method: "DELETE" }, as: alice });
  expect(db.prepare("select count(*) n from interest").get()).toMatchObject({ n: 0 });
});
