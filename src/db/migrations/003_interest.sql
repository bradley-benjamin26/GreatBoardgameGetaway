create table interest (
  user_id integer not null references users(id) on delete cascade,
  game_id integer not null references games(id) on delete cascade,
  primary key (user_id, game_id)
);
