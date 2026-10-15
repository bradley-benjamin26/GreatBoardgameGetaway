import { expect, it } from "vitest";
import { makeApp } from "../helpers/app.js";

it("US3: tables added by one user show for everyone and renames carry over", async () => {
  const { req, signUp, db } = makeApp();
  const a = await signUp("alice");
  const b = await signUp("bob");
  await req("/tables", { form: { name: "Basement table", seats: "6" }, as: a });
  await req("/tables", { form: { name: "Dining room table", seats: "8" }, as: a });

  const html = await (await req("/tables", { as: b })).text();
  expect(html).toContain("Basement table");
  expect(html).toContain("Dining room table");

  const id = (
    db.prepare("select id from tables where name = 'Basement table'").get() as { id: number }
  ).id;
  await req(`/tables/${id}`, { form: { name: "Cellar table", seats: "6" }, as: b });
  expect(await (await req("/tables", { as: a })).text()).toContain("Cellar table");
});
