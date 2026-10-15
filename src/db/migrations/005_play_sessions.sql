create table play_sessions (
  id integer primary key,
  game_id integer not null references games(id),
  table_id integer not null references tables(id) on delete cascade,
  day text not null,
  start_minute integer not null check (start_minute between 0 and 1410 and start_minute % 30 = 0),
  length_minutes integer not null check (length_minutes between 30 and 1440 and length_minutes % 30 = 0),
  host_id integer not null references users(id),
  status text not null default 'scheduled' check (status in ('scheduled', 'cancelled')),
  created_at integer not null
);

create table play_session_players (
  play_session_id integer not null references play_sessions(id) on delete cascade,
  user_id integer not null references users(id) on delete cascade,
  primary key (play_session_id, user_id)
);
