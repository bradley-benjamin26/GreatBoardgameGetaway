import { describe, expect, it } from "vitest";
import { makeApp } from "../helpers/app.js";

describe("tables", () => {
  it("adds a table with and without a seat count", async () => {
    const { req, signUp } = makeApp();
    const s = await signUp();
    expect(
      (await req("/tables", { form: { name: "Basement table", seats: "6" }, as: s })).status,
    ).toBe(303);
    expect(
      (await req("/tables", { form: { name: "Dining room table", seats: "" }, as: s })).status,
    ).toBe(303);
    const html = await (await req("/tables", { as: s })).text();
    expect(html).toContain("Basement table");
    expect(html).toContain("seats 6");
    expect(html).toContain("Dining room table");
  });

  it("rejects a duplicate name (any case) with 409", async () => {
    const { req, signUp } = makeApp();
    const s = await signUp();
    await req("/tables", { form: { name: "Porch", seats: "" }, as: s });
    expect((await req("/tables", { form: { name: "porch", seats: "" }, as: s })).status).toBe(409);
  });

  it.each([
    ["empty name", { name: "  " }],
    ["zero seats", { seats: "0" }],
    ["non-numeric seats", { seats: "many" }],
  ])("rejects %s with 400", async (_n, over) => {
    const { req, signUp } = makeApp();
    const s = await signUp();
    expect(
      (await req("/tables", { form: { name: "Porch", seats: "4", ...over }, as: s })).status,
    ).toBe(400);
  });

  it("lets any signed-in user rename a table or change its seats", async () => {
    const { req, signUp, db } = makeApp();
    const a = await signUp();
    const b = await signUp();
    await req("/tables", { form: { name: "Porch", seats: "4" }, as: a });
    const id = (db.prepare("select id from tables").get() as { id: number }).id;
    expect(
      (await req(`/tables/${id}`, { form: { name: "Back porch", seats: "5" }, as: b })).status,
    ).toBe(303);
    expect(db.prepare("select name, seats from tables").get()).toEqual({
      name: "Back porch",
      seats: 5,
    });
  });

  it("removes a table, and 404s for an unknown one", async () => {
    const { req, signUp, db } = makeApp();
    const s = await signUp();
    await req("/tables", { form: { name: "Porch", seats: "" }, as: s });
    const id = (db.prepare("select id from tables").get() as { id: number }).id;
    expect((await req(`/tables/${id}/delete`, { form: {}, as: s })).status).toBe(303);
    expect(db.prepare("select count(*) n from tables").get()).toMatchObject({ n: 0 });
    expect((await req("/tables/999/delete", { form: {}, as: s })).status).toBe(404);
  });
});
