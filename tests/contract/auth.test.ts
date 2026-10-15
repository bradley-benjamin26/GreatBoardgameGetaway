import { describe, expect, it } from "vitest";
import { makeApp, EVENT_CODE } from "../helpers/app.js";

const good = {
  username: "alice",
  email: "alice@example.com",
  password: "correct horse battery",
  eventCode: EVENT_CODE,
};

describe("sign-up", () => {
  it("refuses a wrong event code with 403", async () => {
    const { req } = makeApp();
    expect((await req("/signup", { form: { ...good, eventCode: "nope" } })).status).toBe(403);
  });
  it("creates an account, signs in and sets a secure HttpOnly cookie", async () => {
    const { req } = makeApp();
    const res = await req("/signup", { form: good });
    expect(res.status).toBe(303);
    const cookie = res.headers.get("set-cookie")!;
    expect(cookie).toMatch(/HttpOnly/i);
    expect(cookie).toMatch(/Secure/i);
    expect(cookie).toMatch(/SameSite=Lax/i);
  });
  it("rejects a duplicate username or email, case-insensitively, with 409", async () => {
    const { req } = makeApp();
    await req("/signup", { form: good });
    expect(
      (await req("/signup", { form: { ...good, username: "ALICE", email: "x@example.com" } }))
        .status,
    ).toBe(409);
    expect(
      (await req("/signup", { form: { ...good, username: "bob", email: "ALICE@example.com" } }))
        .status,
    ).toBe(409);
  });
  it.each([
    ["short username", { username: "ab" }],
    ["long username", { username: "a".repeat(31) }],
    ["bad email", { email: "not-an-email" }],
    ["short password", { password: "short" }],
  ])("returns 400 for %s", async (_n, over) => {
    const { req } = makeApp();
    expect((await req("/signup", { form: { ...good, ...over } })).status).toBe(400);
  });
});

describe("sign-in and sign-out", () => {
  it("signs in with the right password only", async () => {
    const { req } = makeApp();
    await req("/signup", { form: good });
    expect(
      (await req("/signin", { form: { username: "alice", password: "wrong-password!" } })).status,
    ).toBe(400);
    const ok = await req("/signin", { form: { username: "Alice", password: good.password } });
    expect(ok.status).toBe(303);
  });
  it("signs out and the old cookie stops working", async () => {
    const { req, signUp, app } = makeApp();
    const s = await signUp();
    expect((await req("/", { as: s })).status).toBe(200);
    await req("/signout", { method: "POST", form: {}, as: s });
    const after = await app.request("/", { headers: { cookie: s.cookie } });
    expect(after.status).toBe(303);
  });
});

describe("protected routes", () => {
  it("sends anonymous users to sign in", async () => {
    const { req } = makeApp();
    const res = await req("/");
    expect(res.status).toBe(303);
    expect(res.headers.get("location")).toBe("/signin");
  });
  it("refuses a state-changing request without a CSRF token", async () => {
    const { req, signUp } = makeApp();
    const s = await signUp();
    expect((await req("/signout", { method: "POST", form: { _csrf: "bad" }, as: s })).status).toBe(
      403,
    );
  });
});

describe("password reset", () => {
  it("answers the same for known and unknown emails and mails only the known one", async () => {
    const { req, mailer } = makeApp();
    await req("/signup", { form: good });
    const a = await req("/reset", { form: { email: "alice@example.com" } });
    const b = await req("/reset", { form: { email: "nobody@example.com" } });
    expect(a.status).toBe(b.status);
    expect(await a.text()).toBe(await b.text());
    expect(mailer.sent).toHaveLength(1);
    expect(mailer.sent[0].to).toBe("alice@example.com");
  });
  it("sets a new password via the link, once, and signs out other devices", async () => {
    const { req, mailer, app } = makeApp();
    const up = await req("/signup", { form: good });
    const oldCookie = up.headers.get("set-cookie")!.split(";")[0];
    await req("/reset", { form: { email: "alice@example.com" } });
    const token = mailer.sent[0].text.match(/reset\/([\w-]+)/)![1];
    expect((await req(`/reset/${token}`, { form: { password: "a-brand-new-pass" } })).status).toBe(
      303,
    );
    expect((await req(`/reset/${token}`, { form: { password: "yet-another-pass" } })).status).toBe(
      400,
    );
    expect(
      (await req("/signin", { form: { username: "alice", password: "a-brand-new-pass" } })).status,
    ).toBe(303);
    expect((await app.request("/", { headers: { cookie: oldCookie } })).status).toBe(303);
  });
  it("rejects an unknown token", async () => {
    const { req } = makeApp();
    expect(
      (await req("/reset/not-a-token", { form: { password: "a-brand-new-pass" } })).status,
    ).toBe(400);
  });
});

describe("rate limiting", () => {
  it("returns 429 after too many attempts from one address", async () => {
    const { req } = makeApp();
    let last = 0;
    for (let i = 0; i < 40; i++)
      last = (await req("/signin", { form: { username: "x", password: "y" }, ip: "9.9.9.9" }))
        .status;
    expect(last).toBe(429);
  });
});
