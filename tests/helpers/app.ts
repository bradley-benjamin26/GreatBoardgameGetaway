import { createApp } from "../../src/app.js";
import { openDb, migrate } from "../../src/db/index.js";
import type { Config } from "../../src/config.js";
import { FakeBgg } from "./fakeBgg.js";
import { FakeMailer } from "./fakeMailer.js";

export const EVENT_CODE = "testcode";

export function testConfig(over: Partial<Config> = {}): Config {
  return {
    eventCode: EVENT_CODE,
    eventDays: ["2026-11-06", "2026-11-07", "2026-11-08"],
    sessionSecret: "test-secret-test-secret-test-secret",
    bggToken: undefined,
    smtpUrl: "smtp://localhost:1025",
    mailFrom: "test@example.com",
    dbPath: ":memory:",
    cookieSecure: true,
    port: 3000,
    baseUrl: "http://localhost:3000",
    ...over,
  };
}

export type Session = { username: string; email: string; cookie: string; csrf: string };

export function makeApp(over: Partial<Config> = {}) {
  const db = openDb(":memory:");
  migrate(db);
  const config = testConfig(over);
  const mailer = new FakeMailer();
  const bgg = new FakeBgg();
  const app = createApp({ db, config, mailer, bgg });
  let n = 0;

  async function req(
    path: string,
    opts: { method?: string; form?: Record<string, string>; as?: Session; ip?: string } = {},
  ) {
    const headers: Record<string, string> = { "x-forwarded-for": opts.ip ?? `10.0.0.${++n}` };
    if (opts.as) headers.cookie = opts.as.cookie;
    let body: string | undefined;
    if (opts.form) {
      const form = { ...opts.form };
      if (opts.as && form._csrf === undefined) form._csrf = opts.as.csrf;
      body = new URLSearchParams(form).toString();
      headers["content-type"] = "application/x-www-form-urlencoded";
    }
    return app.request(path, { method: opts.method ?? (body ? "POST" : "GET"), headers, body });
  }

  async function signUp(username = `user${++n}`): Promise<Session> {
    const email = `${username}@example.com`;
    const res = await req("/signup", {
      form: { username, email, password: "correct horse battery", eventCode: EVENT_CODE },
    });
    if (res.status !== 303) throw new Error(`signUp failed: ${res.status}`);
    const cookie = (res.headers.get("set-cookie") ?? "").split(";")[0];
    const page = await app.request("/", { headers: { cookie } });
    const csrf = /name="_csrf" value="([^"]+)"/.exec(await page.text())?.[1] ?? "";
    return { username, email, cookie, csrf };
  }

  return { app, db, config, mailer, bgg, req, signUp };
}
