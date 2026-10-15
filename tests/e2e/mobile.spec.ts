import { expect, test } from "@playwright/test";
import { SIGNED_IN_PAGES, SIGNED_OUT_PAGES, seed } from "./helpers.js";

test.use({ viewport: { width: 320, height: 640 } });

async function check(page: import("@playwright/test").Page, path: string) {
  await page.goto(path);
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(overflow, `${path} scrolls sideways`).toBeLessThanOrEqual(0);

  const small = await page.evaluate(() => {
    const sel =
      "button, select, input:not([type=hidden]):not([type=checkbox]), nav a, footer a, li > a, section > a, main > a, label:has(input[type=checkbox])";
    return [...document.querySelectorAll<HTMLElement>(sel)]
      .map((el) => ({ el, r: el.getBoundingClientRect() }))
      .filter(({ el, r }) => r.width > 0 && !el.closest(".skip") && (r.width < 44 || r.height < 44))
      .map(
        ({ el, r }) =>
          `${el.tagName} "${(el.textContent ?? "").trim().slice(0, 30)}" ${Math.round(r.width)}x${Math.round(r.height)}`,
      );
  });
  expect(small, `${path} has targets under 44x44`).toEqual([]);

  const hoverOnly = await page.evaluate(
    () =>
      [...document.styleSheets]
        .flatMap((s) => [...s.cssRules])
        .filter((r) => r.cssText.includes(":hover")).length,
  );
  expect(hoverOnly, "hover-only styles").toBe(0);
}

test("signed-out pages fit a 320px phone with large touch targets", async ({ page }) => {
  for (const p of SIGNED_OUT_PAGES) await check(page, p);
});

test("signed-in pages fit a 320px phone with large touch targets", async ({ page }) => {
  await seed(page);
  for (const p of [...SIGNED_IN_PAGES, "/sessions/1/edit"]) await check(page, p);
});
