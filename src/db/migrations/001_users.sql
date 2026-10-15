create table users (
  id integer primary key,
  username text not null unique collate nocase,
  email text not null unique collate nocase,
  password_hash text not null,
  created_at integer not null
);

create table login_tokens (
  token_hash text primary key,
  user_id integer not null references users(id) on delete cascade,
  expires_at integer not null
);

create table password_reset_tokens (
  token_hash text primary key,
  user_id integer not null references users(id) on delete cascade,
  expires_at integer not null,
  used_at integer
);
