import type { TableRow } from "../services/tables.js";
import { Csrf, ErrorNote, Layout, type Page } from "./layout.js";

export const Tables = (
  p: Page & { tables: TableRow[]; error?: string; confirm?: { id: number; n: number } },
) => (
  <Layout title="Tables" user={p.user} csrf={p.csrf}>
    <h1>Tables</h1>
    <ErrorNote message={p.error} />
    {p.confirm && (
      <form method="post" action={`/tables/${p.confirm.id}/delete`} role="alert">
        <Csrf token={p.csrf} />
        <input type="hidden" name="confirm" value="1" />
        <p class="error">
          This table has {p.confirm.n} scheduled session{p.confirm.n === 1 ? "" : "s"}. Removing it
          cancels and deletes them.
        </p>
        <button type="submit">Remove anyway</button>
      </form>
    )}
    {p.tables.length === 0 && <p>No tables yet. Add the places where you'll play.</p>}
    <ul class="list">
      {p.tables.map((t) => (
        <li>
          <strong>{t.name}</strong>{" "}
          <span class="muted">{t.seats ? `seats ${t.seats}` : "seats not set"}</span>
          <form method="post" action={`/tables/${t.id}`}>
            <Csrf token={p.csrf} />
            <label>
              Name
              <input name="name" value={t.name} required maxlength={60} />
            </label>
            <label>
              Seats (optional)
              <input
                name="seats"
                type="number"
                inputmode="numeric"
                min={1}
                max={99}
                value={t.seats ?? ""}
              />
            </label>
            <button type="submit">Save</button>
          </form>
          <form method="post" action={`/tables/${t.id}/delete`}>
            <Csrf token={p.csrf} />
            <button type="submit">Remove {t.name}</button>
          </form>
        </li>
      ))}
    </ul>
    <form method="post" action="/tables">
      <h2>Add a table</h2>
      <Csrf token={p.csrf} />
      <label>
        Name
        <input name="name" required maxlength={60} />
      </label>
      <label>
        Seats (optional)
        <input name="seats" type="number" inputmode="numeric" min={1} max={99} />
      </label>
      <button type="submit">Add table</button>
    </form>
  </Layout>
);
