import type { Child } from "hono/jsx";

export type Page = { user?: { username: string }; csrf?: string };

export function Layout(p: Page & { title: string; children?: Child }) {
  return (
    <html lang="en">
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>{p.title} · Great Boardgame Getaway</title>
        <link rel="stylesheet" href="/static/app.css" />
      </head>
      <body>
        <a class="skip" href="#main">
          Skip to content
        </a>
        <header>
          <strong>Great Boardgame Getaway</strong>
          {p.user && (
            <nav aria-label="Main">
              <a href="/games">Games</a>
              <a href="/my/games">My games</a>
              <a href="/tables">Tables</a>
              <a href="/schedule">Schedule</a>
              <form method="post" action="/signout">
                <input type="hidden" name="_csrf" value={p.csrf} />
                <button type="submit">Sign out ({p.user.username})</button>
              </form>
            </nav>
          )}
        </header>
        <main id="main">{p.children}</main>
        {p.user && (
          <footer>
            <p class="muted">
              Game data from <a href="https://boardgamegeek.com">BoardGameGeek</a>.
            </p>
          </footer>
        )}
      </body>
    </html>
  );
}

export const Csrf = ({ token }: { token?: string }) => (
  <input type="hidden" name="_csrf" value={token} />
);

export function ErrorNote({ message }: { message?: string }) {
  return message ? (
    <p role="alert" class="error">
      {message}
    </p>
  ) : null;
}
