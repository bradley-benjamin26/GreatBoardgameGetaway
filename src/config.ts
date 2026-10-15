export type Config = {
  eventCode: string;
  eventDays: string[];
  sessionSecret: string;
  bggToken: string | undefined;
  smtpUrl: string;
  mailFrom: string;
  dbPath: string;
  cookieSecure: boolean;
  port: number;
  baseUrl: string;
};

export function loadConfig(env: Record<string, string | undefined> = process.env): Config {
  const need = (k: string) => {
    const v = env[k]?.trim();
    if (!v) throw new Error(`Missing required setting ${k} (see .env.example)`);
    return v;
  };
  const eventDays = need("EVENT_DAYS")
    .split(",")
    .map((d) => d.trim());
  if (!eventDays.every((d) => /^\d{4}-\d{2}-\d{2}$/.test(d) && !isNaN(Date.parse(d)))) {
    throw new Error("EVENT_DAYS must be comma-separated dates like 2026-11-06");
  }
  const sessionSecret = need("SESSION_SECRET");
  if (sessionSecret.length < 32) throw new Error("SESSION_SECRET must be at least 32 characters");
  return {
    eventCode: need("EVENT_CODE"),
    eventDays,
    sessionSecret,
    bggToken: env.BGG_TOKEN?.trim() || undefined,
    smtpUrl: need("SMTP_URL"),
    mailFrom: need("MAIL_FROM"),
    dbPath: env.DB_PATH?.trim() || "./getaway.db",
    cookieSecure: env.COOKIE_INSECURE !== "1",
    port: Number(env.PORT) || 3000,
    baseUrl: (env.BASE_URL?.trim() || "http://localhost:3000").replace(/\/$/, ""),
  };
}
