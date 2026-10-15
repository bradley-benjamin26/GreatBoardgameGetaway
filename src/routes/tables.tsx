import { Hono, type Context } from "hono";
import type { Env } from "../app.js";
import type { PlaySessions } from "../services/playSessions.js";
import type { Tables } from "../services/tables.js";
import { AppError } from "../types.js";
import { Tables as TablesPage } from "../views/tables.js";

export function tableRoutes(tables: Tables, sessions: PlaySessions) {
  const r = new Hono<Env>();
  const s = (b: Record<string, unknown>, k: string) =>
    typeof b[k] === "string" ? (b[k] as string) : "";

  r.get("/tables", (c) =>
    c.html(<TablesPage user={c.get("user")} csrf={c.get("csrf")} tables={tables.list()} />),
  );

  const act =
    (fn: (b: Record<string, unknown>, id: number, userId: number) => void) =>
    async (c: Context<Env>) => {
      try {
        fn(await c.req.parseBody(), Number(c.req.param("id")), c.get("user")!.id);
        return c.redirect("/tables", 303);
      } catch (e) {
        if (!(e instanceof AppError) || e.status === 404) throw e;
        return c.html(
          <TablesPage
            user={c.get("user")}
            csrf={c.get("csrf")}
            tables={tables.list()}
            error={e.message}
          />,
          e.status as 400,
        );
      }
    };

  r.post(
    "/tables",
    act((b, _id, uid) => tables.add(uid, s(b, "name"), s(b, "seats"))),
  );
  r.post(
    "/tables/:id",
    act((b, id) => tables.update(id, s(b, "name"), s(b, "seats"))),
  );
  r.post("/tables/:id/delete", async (c) => {
    const id = Number(c.req.param("id"));
    tables.exists(id);
    const n = sessions.scheduledAtTable(id);
    if (n > 0 && (await c.req.parseBody()).confirm !== "1") {
      return c.html(
        <TablesPage
          user={c.get("user")}
          csrf={c.get("csrf")}
          tables={tables.list()}
          confirm={{ id, n }}
        />,
        409,
      );
    }
    tables.remove(id); // play sessions go with the table (on delete cascade)
    return c.redirect("/tables", 303);
  });
  return r;
}
