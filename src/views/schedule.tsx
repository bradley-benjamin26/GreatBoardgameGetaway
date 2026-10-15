import type { SessionView } from "../services/playSessions.js";
import { clock } from "../services/timeWindow.js";
import type { BroughtGame } from "../services/games.js";
import type { TableRow } from "../services/tables.js";
import { Csrf, ErrorNote, Layout, type Page } from "./layout.js";

const halfHours = Array.from({ length: 48 }, (_, i) => i * 30);
const lengths = Array.from({ length: 48 }, (_, i) => (i + 1) * 30);
const lengthLabel = (m: number) =>
  `${Math.floor(m / 60)}h${m % 60 ? " 30m" : ""}`.replace(/^0h /, "");

type FormValues = {
  gameId?: number;
  tableId?: number;
  day?: string;
  start?: number;
  length?: number;
};

export const TimeFields = (p: { days: string[]; tables: TableRow[]; v: FormValues }) => (
  <>
    <label>
      Table
      <select name="tableId" required>
        {p.tables.map((t) => (
          <option value={t.id} selected={t.id === p.v.tableId}>
            {t.name}
          </option>
        ))}
      </select>
    </label>
    <label>
      Day
      <select name="day" required>
        {p.days.map((d) => (
          <option value={d} selected={d === p.v.day}>
            {d}
          </option>
        ))}
      </select>
    </label>
    <label>
      Start time
      <select name="start" required>
        {halfHours.map((m) => (
          <option value={clock(m)} selected={m === (p.v.start ?? 19 * 60)}>
            {clock(m)}
          </option>
        ))}
      </select>
    </label>
    <label>
      Estimated length
      <select name="lengthMinutes" required>
        {lengths.map((m) => (
          <option value={m} selected={m === (p.v.length ?? 120)}>
            {lengthLabel(m)}
          </option>
        ))}
      </select>
    </label>
  </>
);

const when = (s: SessionView) => {
  const end = s.startMinute + s.lengthMinutes;
  return `${clock(s.startMinute)}–${clock(end)}${end > 1440 ? " (next day)" : ""}`;
};

function SessionItem({ s, me, csrf }: { s: SessionView; me?: number; csrf?: string }) {
  const left = s.seatLimit - s.players.length;
  const joined = s.players.some((p) => p.id === me);
  const post = (path: string) => `/sessions/${s.id}/${path}`;
  return (
    <li>
      <strong>{s.gameTitle}</strong> at {s.tableName}, {when(s)}
      {s.status === "cancelled" && <strong> · Cancelled</strong>}
      <div class="muted">
        Host: {s.hostName} · Players: {s.players.map((p) => p.username).join(", ")}
      </div>
      {s.status === "scheduled" && (
        <div>
          {left} seat{left === 1 ? "" : "s"} left
        </div>
      )}
      {s.status === "scheduled" && s.bringers === 0 && (
        <div class="error">Nobody is bringing this game any more.</div>
      )}
      {s.status === "scheduled" && (
        <>
          {joined && s.hostId !== me ? (
            <form method="post" action={post("leave")}>
              <Csrf token={csrf} />
              <button type="submit">Leave</button>
            </form>
          ) : !joined ? (
            <form method="post" action={post("join")}>
              <Csrf token={csrf} />
              <button type="submit" disabled={left <= 0}>
                Join
              </button>
            </form>
          ) : null}
          {s.hostId === me && (
            <>
              <a href={`/sessions/${s.id}/edit`}>Edit</a>
              <form method="post" action={post("cancel")}>
                <Csrf token={csrf} />
                <button type="submit">Cancel session</button>
              </form>
              {s.players.length > 1 && (
                <form method="post" action={post("handover")}>
                  <Csrf token={csrf} />
                  <label>
                    Leave and hand hosting to
                    <select name="newHostId">
                      {s.players
                        .filter((p) => p.id !== me)
                        .map((p) => (
                          <option value={p.id}>{p.username}</option>
                        ))}
                    </select>
                  </label>
                  <button type="submit">Hand over and leave</button>
                </form>
              )}
            </>
          )}
        </>
      )}
    </li>
  );
}

export const Schedule = (
  p: Page & {
    me?: number;
    sessions: SessionView[];
    days: string[];
    games: BroughtGame[];
    tables: TableRow[];
    error?: string;
    v?: FormValues;
  },
) => {
  const byDay = new Map<string, SessionView[]>();
  for (const s of p.sessions) byDay.set(s.day, [...(byDay.get(s.day) ?? []), s]);
  return (
    <Layout title="Schedule" user={p.user} csrf={p.csrf}>
      <h1>Schedule</h1>
      <ErrorNote message={p.error} />
      {p.sessions.length === 0 && <p>Nothing scheduled yet.</p>}
      {[...byDay].map(([day, list]) => (
        <section>
          <h2>{day}</h2>
          <ul class="list">
            {list.map((s) => (
              <SessionItem s={s} me={p.me} csrf={p.csrf} />
            ))}
          </ul>
        </section>
      ))}
      {p.games.length === 0 || p.tables.length === 0 ? (
        <p>
          To schedule a game you need at least one game being brought and one table.{" "}
          <a href="/my/games">Games</a> · <a href="/tables">Tables</a>
        </p>
      ) : (
        <form method="post" action="/sessions">
          <h2>Schedule a game</h2>
          <Csrf token={p.csrf} />
          <label>
            Game
            <select name="gameId" required>
              {p.games.map((g) => (
                <option value={g.id} selected={g.id === p.v?.gameId}>
                  {g.title}
                </option>
              ))}
            </select>
          </label>
          <TimeFields days={p.days} tables={p.tables} v={p.v ?? {}} />
          <button type="submit">Schedule</button>
        </form>
      )}
    </Layout>
  );
};

export const SessionEdit = (
  p: Page & { s: SessionView; days: string[]; tables: TableRow[]; error?: string },
) => (
  <Layout title="Edit session" user={p.user} csrf={p.csrf}>
    <h1>Edit {p.s.gameTitle}</h1>
    <ErrorNote message={p.error} />
    <form method="post" action={`/sessions/${p.s.id}/edit`}>
      <Csrf token={p.csrf} />
      <TimeFields
        days={p.days}
        tables={p.tables}
        v={{
          tableId: p.s.tableId,
          day: p.s.day,
          start: p.s.startMinute,
          length: p.s.lengthMinutes,
        }}
      />
      <button type="submit">Save changes</button>
    </form>
    <p>
      <a href="/schedule">Back to schedule</a>
    </p>
  </Layout>
);

export const JoinWarning = (p: Page & { id: number; warning: string }) => (
  <Layout title="Join anyway?" user={p.user} csrf={p.csrf}>
    <h1>Join anyway?</h1>
    <p role="alert">{p.warning}</p>
    <form method="post" action={`/sessions/${p.id}/join`}>
      <Csrf token={p.csrf} />
      <input type="hidden" name="confirm" value="1" />
      <button type="submit">Join anyway</button>
    </form>
    <p>
      <a href="/schedule">Back to schedule</a>
    </p>
  </Layout>
);
