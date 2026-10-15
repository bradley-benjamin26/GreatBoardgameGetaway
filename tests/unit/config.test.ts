import { describe, expect, it } from "vitest";
import { loadConfig } from "../../src/config.js";

const base = {
  EVENT_CODE: "abc",
  EVENT_DAYS: "2026-11-06, 2026-11-07",
  SESSION_SECRET: "s".repeat(32),
  SMTP_URL: "smtp://localhost:1025",
  MAIL_FROM: "a@b.c",
};

describe("loadConfig", () => {
  it("parses event days and defaults", () => {
    const c = loadConfig(base);
    expect(c.eventDays).toEqual(["2026-11-06", "2026-11-07"]);
    expect(c.bggToken).toBeUndefined();
    expect(c.cookieSecure).toBe(true);
  });
  it.each(["EVENT_CODE", "SESSION_SECRET", "SMTP_URL", "MAIL_FROM", "EVENT_DAYS"])(
    "fails fast without %s",
    (k) => {
      expect(() => loadConfig({ ...base, [k]: "" })).toThrow(k);
    },
  );
  it("rejects a malformed day", () => {
    expect(() => loadConfig({ ...base, EVENT_DAYS: "tomorrow" })).toThrow("EVENT_DAYS");
  });
});
