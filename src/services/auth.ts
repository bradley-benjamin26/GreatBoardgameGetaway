import { createHash, randomBytes, scrypt, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";
import type { Config } from "../config.js";
import { AppError, type Db, type Mailer } from "../types.js";

const scryptAsync = promisify(scrypt) as (pw: string, salt: Buffer, len: number) => Promise<Buffer>;

const LOGIN_MS = 30 * 24 * 3600_000;
const RESET_MS = 60 * 60_000;

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  const key = await scryptAsync(password, salt, 64);
  return `${salt.toString("hex")}:${key.toString("hex")}`;
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [salt, key] = stored.split(":");
  const expected = Buffer.from(key, "hex");
  const actual = await scryptAsync(password, Buffer.from(salt, "hex"), expected.length);
  return timingSafeEqual(actual, expected);
}

export const hashToken = (t: string) => createHash("sha256").update(t).digest("hex");
const newToken = () => randomBytes(32).toString("base64url");

function same(a: string, b: string) {
  const x = createHash("sha256").update(a).digest();
  const y = createHash("sha256").update(b).digest();
  return timingSafeEqual(x, y);
}

function checkPassword(p: string) {
  if (p.length < 10) throw new AppError(400, "Choose a password of at least 10 characters.");
}

export type User = { id: number; username: string };

export function createAuth({ db, config, mailer }: { db: Db; config: Config; mailer: Mailer }) {
  const dummyHash = hashPassword("dummy-password-for-timing");

  function issueLogin(userId: number) {
    const token = newToken();
    db.prepare("insert into login_tokens (token_hash, user_id, expires_at) values (?, ?, ?)").run(
      hashToken(token),
      userId,
      Date.now() + LOGIN_MS,
    );
    return token;
  }

  return {
    async signUp(f: { username: string; email: string; password: string; eventCode: string }) {
      if (!same(f.eventCode, config.eventCode))
        throw new AppError(403, "That event code isn't right.");
      if (!/^[A-Za-z0-9_.-]{3,30}$/.test(f.username))
        throw new AppError(
          400,
          "Username must be 3 to 30 letters, numbers, dots, dashes or underscores.",
        );
      if (f.email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.email))
        throw new AppError(400, "Enter a valid email address.");
      checkPassword(f.password);
      const taken = db
        .prepare("select username, email from users where username = ? or email = ?")
        .get(f.username, f.email) as { username: string; email: string } | undefined;
      if (taken)
        throw new AppError(
          409,
          taken.username.toLowerCase() === f.username.toLowerCase()
            ? "That username is taken."
            : "That email is already in use.",
        );
      const info = db
        .prepare(
          "insert into users (username, email, password_hash, created_at) values (?, ?, ?, ?)",
        )
        .run(f.username, f.email, await hashPassword(f.password), Date.now());
      return {
        userId: Number(info.lastInsertRowid),
        token: issueLogin(Number(info.lastInsertRowid)),
      };
    },

    async signIn(username: string, password: string) {
      const row = db
        .prepare("select id, password_hash from users where username = ?")
        .get(username) as { id: number; password_hash: string } | undefined;
      const ok = await verifyPassword(password, row?.password_hash ?? (await dummyHash));
      if (!row || !ok) throw new AppError(400, "Wrong username or password.");
      return { userId: row.id, token: issueLogin(row.id) };
    },

    signOut(token: string) {
      db.prepare("delete from login_tokens where token_hash = ?").run(hashToken(token));
    },

    userForToken(token: string): User | undefined {
      return db
        .prepare(
          `select u.id, u.username from login_tokens t join users u on u.id = t.user_id
           where t.token_hash = ? and t.expires_at > ?`,
        )
        .get(hashToken(token), Date.now()) as User | undefined;
    },

    /** Always resolves the same way so callers cannot learn which emails are registered. */
    async requestReset(email: string) {
      const user = db.prepare("select id from users where email = ?").get(email) as
        { id: number } | undefined;
      if (!user) return;
      const token = newToken();
      db.prepare("delete from password_reset_tokens where user_id = ? and used_at is null").run(
        user.id,
      );
      db.prepare(
        "insert into password_reset_tokens (token_hash, user_id, expires_at) values (?, ?, ?)",
      ).run(hashToken(token), user.id, Date.now() + RESET_MS);
      try {
        await mailer.send(
          email,
          "Reset your Great Boardgame Getaway password",
          `Use this link within one hour to choose a new password:\n${config.baseUrl}/reset/${token}\n\nIf you didn't ask for this, ignore this email.`,
        );
      } catch (e) {
        console.error("reset email failed", e);
      }
    },

    async completeReset(token: string, password: string) {
      checkPassword(password);
      const row = db
        .prepare(
          "select user_id from password_reset_tokens where token_hash = ? and used_at is null and expires_at > ?",
        )
        .get(hashToken(token), Date.now()) as { user_id: number } | undefined;
      if (!row)
        throw new AppError(400, "This link has expired or was already used. Request a new one.");
      const hash = await hashPassword(password);
      db.transaction(() => {
        db.prepare("update users set password_hash = ? where id = ?").run(hash, row.user_id);
        db.prepare("update password_reset_tokens set used_at = ? where token_hash = ?").run(
          Date.now(),
          hashToken(token),
        );
        db.prepare("delete from login_tokens where user_id = ?").run(row.user_id);
      })();
    },
  };
}
export type Auth = ReturnType<typeof createAuth>;
