import { describe, expect, it } from "vitest";
import { hashPassword, verifyPassword, hashToken } from "../../src/services/auth.js";
import { makeApp, EVENT_CODE } from "../helpers/app.js";
import { createAuth } from "../../src/services/auth.js";

describe("passwords", () => {
  it("verifies the right password and not a wrong one", async () => {
    const h = await hashPassword("pw-12345678");
    expect(h).not.toContain("pw-12345678");
    expect(await verifyPassword("pw-12345678", h)).toBe(true);
    expect(await verifyPassword("other", h)).toBe(false);
  });
});

describe("tokens", () => {
  const setup = () => {
    const t = makeApp();
    const auth = createAuth({ db: t.db, config: t.config, mailer: t.mailer });
    return { ...t, auth };
  };
  const sign = (auth: ReturnType<typeof createAuth>) =>
    auth.signUp({
      username: "alice",
      email: "a@x.io",
      password: "longenough-pw",
      eventCode: EVENT_CODE,
    });

  it("stores login tokens hashed and rejects expired ones", async () => {
    const { auth, db } = setup();
    const { token } = await sign(auth);
    expect(
      db.prepare("select count(*) n from login_tokens where token_hash = ?").get(token),
    ).toMatchObject({ n: 0 });
    expect(auth.userForToken(token)?.username).toBe("alice");
    db.prepare("update login_tokens set expires_at = 1").run();
    expect(auth.userForToken(token)).toBeUndefined();
  });

  it("reset tokens are hashed, single use and expire after 1 hour", async () => {
    const { auth, db, mailer } = setup();
    await sign(auth);
    await auth.requestReset("a@x.io");
    const link = mailer.sent[0].text.match(/reset\/([\w-]+)/)![1];
    expect(
      db.prepare("select count(*) n from password_reset_tokens where token_hash = ?").get(link),
    ).toMatchObject({ n: 0 });
    const row = db.prepare("select expires_at from password_reset_tokens").get() as {
      expires_at: number;
    };
    const secs = row.expires_at - Date.now();
    expect(secs).toBeGreaterThan(55 * 60_000);
    expect(secs).toBeLessThanOrEqual(60 * 60_000);
    await auth.completeReset(link, "brand-new-password");
    await expect(auth.completeReset(link, "another-new-password")).rejects.toMatchObject({
      status: 400,
    });
    expect(hashToken(link)).toHaveLength(64);
  });
});
