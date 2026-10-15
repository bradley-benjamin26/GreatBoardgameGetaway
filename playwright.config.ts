import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "tests/e2e",
  webServer: {
    command: "npm start",
    url: "http://localhost:3917/signin",
    env: {
      EVENT_CODE: "testcode",
      EVENT_DAYS: "2026-11-06,2026-11-07,2026-11-08",
      SESSION_SECRET: "e2e-secret-e2e-secret-e2e-secret",
      SMTP_URL: "smtp://localhost:1025",
      MAIL_FROM: "e2e@example.com",
      DB_PATH: ":memory:",
      PORT: "3917",
      COOKIE_INSECURE: "1",
    },
    reuseExistingServer: false,
  },
  use: { baseURL: "http://localhost:3917" },
});
