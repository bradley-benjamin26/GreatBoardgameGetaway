create table games (
  id integer primary key,
  title text not null check (length(title) between 1 and 100),
  min_players integer not null check (min_players >= 1),
  max_players integer not null check (max_players >= min_players),
  play_minutes integer not null check (play_minutes >= 1),
  image_url text,
  bgg_id integer unique,
  created_by integer references users(id),
  fetched_at integer
);

create table listings (
  user_id integer not null references users(id) on delete cascade,
  game_id integer not null references games(id) on delete cascade,
  owned integer not null default 0,
  bringing integer not null default 0,
  primary key (user_id, game_id)
);
