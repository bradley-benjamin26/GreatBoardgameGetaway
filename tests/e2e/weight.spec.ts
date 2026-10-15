import { expect, test } from "@playwright/test";
import { gzipSync } from "node:zlib";
import { SIGNED_IN_PAGES, SIGNED_OUT_PAGES, seed } from "./helpers.js";

const BUDGET = 150 * 1024;

test("every core page plus its CSS stays under 150 KB compressed", async ({ page }) => {
  await seed(page);
  const css = gzipSync(await (await page.request.get("/static/app.css")).body()).length;
  for (const path of [...SIGNED_IN_PAGES, ...SIGNED_OUT_PAGES]) {
    const res = await page.request.get(path, { headers: { "accept-encoding": "gzip" } });
    const html = gzipSync(await res.body()).length;
    expect(html + css, path).toBeLessThan(BUDGET);
  }
});

test("the server compresses text responses and caches static files", async ({ request }) => {
  const css = await request.get("/static/app.css", { headers: { "accept-encoding": "gzip" } });
  expect(css.headers()["content-encoding"]).toBe("gzip");
  expect(css.headers()["cache-control"]).toMatch(/max-age=\d+/);
  const page = await request.get("/signin", { headers: { "accept-encoding": "gzip" } });
  expect(page.headers()["content-encoding"]).toBe("gzip");
});
