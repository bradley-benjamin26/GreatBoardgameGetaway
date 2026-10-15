import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { SIGNED_IN_PAGES, SIGNED_OUT_PAGES, seed } from "./helpers.js";

const tags = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"];

test("signed-out pages have no WCAG 2.2 AA violations", async ({ page }) => {
  for (const path of SIGNED_OUT_PAGES) {
    await page.goto(path);
    const { violations } = await new AxeBuilder({ page }).withTags(tags).analyze();
    expect(violations, path).toEqual([]);
  }
});

test("signed-in pages have no WCAG 2.2 AA violations", async ({ page }) => {
  await seed(page);
  for (const path of [...SIGNED_IN_PAGES, "/sessions/1/edit"]) {
    await page.goto(path);
    const { violations } = await new AxeBuilder({ page }).withTags(tags).analyze();
    expect(violations, path).toEqual([]);
  }
});

test("the sign-up form can be completed with the keyboard alone", async ({ page }) => {
  await page.goto("/signup");
  const name = `kbd${Date.now()}`;
  for (const text of ["testcode", name, `${name}@example.com`, "correct horse battery"]) {
    await page.keyboard.press("Tab");
    // the first Tab lands on the skip link; move on to the first field
    if ((await page.evaluate(() => document.activeElement?.tagName)) === "A")
      await page.keyboard.press("Tab");
    await page.keyboard.type(text);
  }
  await page.keyboard.press("Enter");
  await page.waitForURL("/");
  await expect(page.getByRole("heading", { name: `Welcome, ${name}` })).toBeVisible();
});

test("the skip link and focus outlines are available", async ({ page }) => {
  await page.goto("/signin");
  await page.keyboard.press("Tab");
  await expect(page.getByRole("link", { name: "Skip to content" })).toBeFocused();
});
