import type { Page } from "@playwright/test";

let n = 0;

/** Signs up a fresh user, then adds a game, a table and a scheduled session so every page has content. */
export async function seed(page: Page) {
  const name = `e2e${Date.now()}${++n}`;
  await page.goto("/signup");
  await page.getByLabel("Event code").fill("testcode");
  await page.getByLabel("Username").fill(name);
  await page.getByLabel("Email").fill(`${name}@example.com`);
  await page.getByLabel(/^Password/).fill("correct horse battery");
  await page.getByRole("button", { name: "Create account" }).click();
  await page.waitForURL("/");

  await page.goto("/my/games");
  await page.getByLabel("Title").fill("Quest");
  await page.getByLabel("Fewest players").fill("2");
  await page.getByLabel("Most players").fill("4");
  await page.getByLabel("Play time (minutes)").fill("60");
  await page.getByLabel("I'm bringing it").last().check();
  await page.getByRole("button", { name: "Add game" }).click();

  await page.goto("/tables");
  await page.getByLabel("Name").last().fill(`Porch ${name}`);
  await page.getByRole("button", { name: "Add table" }).click();

  await page.goto("/schedule");
  await page.getByRole("button", { name: "Schedule" }).click();
  return name;
}

export const SIGNED_IN_PAGES = ["/", "/games", "/my/games", "/tables", "/schedule"];
export const SIGNED_OUT_PAGES = ["/signin", "/signup", "/reset"];
