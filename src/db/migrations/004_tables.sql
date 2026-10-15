create table tables (
  id integer primary key,
  name text not null unique collate nocase check (length(name) between 1 and 60),
  seats integer check (seats is null or seats >= 1),
  created_by integer references users(id)
);
