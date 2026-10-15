import { Hono } from "hono";
import { deleteCookie, setCookie } from "hono/cookie";
import type { Auth } from "../services/auth.js";
import { AppError } from "../types.js";
import { ResetNew, ResetRequest, SignIn, SignUp } from "../views/auth.js";
import type { Env } from "../app.js";

export const SESSION_COOKIE = "sid";

export function authRoutes(auth: Auth, cookieSecure: boolean) {
  const r = new Hono<Env>();
  const str = (b: Record<string, unknown>, k: string) =>
    typeof b[k] === "string" ? (b[k] as string).trim() : "";
  const login = (c: Parameters<typeof setCookie>[0], token: string) =>
    setCookie(c, SESSION_COOKIE, token, {
      httpOnly: true,
      secure: cookieSecure,
      sameSite: "Lax",
      path: "/",
      maxAge: 30 * 24 * 3600,
    });

  r.get("/signup", (c) => c.html(<SignUp />));
  r.post("/signup", async (c) => {
    const b = await c.req.parseBody();
    const v = { username: str(b, "username"), email: str(b, "email") };
    try {
      const { token } = await auth.signUp({
        ...v,
        password: typeof b.password === "string" ? b.password : "",
        eventCode: str(b, "eventCode"),
      });
      login(c, token);
      return c.redirect("/", 303);
    } catch (e) {
      if (!(e instanceof AppError)) throw e;
      return c.html(<SignUp error={e.message} v={v} />, e.status as 400);
    }
  });

  r.get("/signin", (c) => c.html(<SignIn />));
  r.post("/signin", async (c) => {
    const b = await c.req.parseBody();
    try {
      const { token } = await auth.signIn(
        str(b, "username"),
        typeof b.password === "string" ? b.password : "",
      );
      login(c, token);
      return c.redirect("/", 303);
    } catch (e) {
      if (!(e instanceof AppError)) throw e;
      return c.html(<SignIn error={e.message} />, e.status as 400);
    }
  });

  r.post("/signout", (c) => {
    const token = c.get("token");
    if (token) auth.signOut(token);
    deleteCookie(c, SESSION_COOKIE, { path: "/" });
    return c.redirect("/signin", 303);
  });

  r.get("/reset", (c) => c.html(<ResetRequest />));
  r.post("/reset", async (c) => {
    const b = await c.req.parseBody();
    await auth.requestReset(str(b, "email"));
    return c.html(<ResetRequest sent />);
  });

  r.get("/reset/:token", (c) => c.html(<ResetNew token={c.req.param("token")} />));
  r.post("/reset/:token", async (c) => {
    const b = await c.req.parseBody();
    try {
      await auth.completeReset(
        c.req.param("token"),
        typeof b.password === "string" ? b.password : "",
      );
      return c.redirect("/signin", 303);
    } catch (e) {
      if (!(e instanceof AppError)) throw e;
      return c.html(<ResetNew token={c.req.param("token")} error={e.message} />, e.status as 400);
    }
  });

  return r;
}
