import { serve } from "@hono/node-server";
import { createApp } from "./app.js";
import { loadConfig } from "./config.js";
import { migrate, openDb } from "./db/index.js";
import { createMailer } from "./services/mailer.js";
import { createBgg } from "./services/bgg.js";

const config = loadConfig();
const db = openDb(config.dbPath);
migrate(db);

const bgg = createBgg({ token: config.bggToken });

serve(
  {
    fetch: createApp({ db, config, mailer: createMailer(config), bgg }).fetch,
    port: config.port,
  },
  (info) => console.log(`Listening on :${info.port}`),
);
