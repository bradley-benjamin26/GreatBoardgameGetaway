import { Csrf } from "./layout.js";

export const players = (g: { min_players: number; max_players: number }) =>
  g.min_players === g.max_players
    ? `${g.max_players} players`
    : `${g.min_players}–${g.max_players} players`;

export const Summary = ({
  g,
}: {
  g: {
    title: string;
    min_players: number;
    max_players: number;
    play_minutes: number;
    image_url: string | null;
  };
}) => (
  <>
    {g.image_url && (
      <img class="cover" src={g.image_url} alt="" loading="lazy" referrerpolicy="no-referrer" />
    )}
    <strong>{g.title}</strong>
    <div class="muted">
      {players(g)} · {g.play_minutes} min
    </div>
  </>
);

export const Flags = ({ owned, bringing }: { owned?: boolean; bringing?: boolean }) => (
  <>
    <label>
      <input type="checkbox" name="owned" value="1" checked={owned} /> I own it
    </label>
    <label>
      <input type="checkbox" name="bringing" value="1" checked={bringing} /> I'm bringing it
    </label>
  </>
);

export const ManualForm = ({ csrf }: { csrf?: string }) => (
  <form method="post" action="/my/games">
    <h2>Add a game by hand</h2>
    <Csrf token={csrf} />
    <label>
      Title
      <input name="title" required maxlength={100} />
    </label>
    <label>
      Fewest players
      <input name="minPlayers" type="number" inputmode="numeric" min={1} max={99} required />
    </label>
    <label>
      Most players
      <input name="maxPlayers" type="number" inputmode="numeric" min={1} max={99} required />
    </label>
    <label>
      Play time (minutes)
      <input name="playMinutes" type="number" inputmode="numeric" min={1} max={1440} required />
    </label>
    <Flags owned />
    <button type="submit">Add game</button>
  </form>
);
