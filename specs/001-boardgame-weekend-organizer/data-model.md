# Data Model: Boardgame Weekend Organizer

All times are in the event's local time. Ids are integers.

## User
- `id`, `username` (unique, case-insensitive, 3–30 chars), `email` (unique, case-insensitive, valid address), `password_hash`, `created_at`.
- Only these fields are stored (Principle IV). The email is used only to send reset links and is never displayed to other users.

## PasswordResetToken
- `token_hash`, `user_id`, `expires_at` (1 hour after creation), `used_at` (null until used).
- Single use: a used or expired token is refused. Setting a new password also deletes the user's login tokens.

## LoginToken
- `token_hash`, `user_id`, `expires_at`. One user can have several (several devices).

## Game
- `id`, `title`, `min_players`, `max_players`, `play_minutes`, `image_url` (optional),
  `bgg_id` (unique, null for custom), `created_by` (user id for custom games, null for BGG), `fetched_at`.
- Rules: custom games require title, min/max players and play time; `min_players` ≤ `max_players`.

## Listing
- `user_id`, `game_id`, `owned` (bool), `bringing` (bool); unique on (`user_id`, `game_id`).
- Rule: a row where both flags are false is deleted. Satisfies FR-003.

## Interest
- `user_id`, `game_id`; unique pair. Count per game is derived (FR-005).

## Table
- `id`, `name` (unique), `seats` (optional, ≥ 1), `created_by`.
- Rule: cannot be removed while play sessions exist unless the user confirms cancelling them (FR-017).

## PlaySession
- `id`, `game_id`, `table_id`, `day` (one of the configured event days), `start_minute` (0–1410, multiple of 30),
  `length_minutes` (multiple of 30, ≥ 30, ≤ 1440), `host_id`, `status` (`scheduled` | `cancelled`), `created_at`.
- Rules:
  - The game MUST be marked bringing by at least one user (FR-007).
  - A session may end on the day after `day`. The end is `start_minute + length_minutes` counted from the start of `day`.
  - No two scheduled sessions at the same table overlap in absolute time, including across midnight (FR-008).
  - An edit re-runs these rules ignoring the session itself, and seat limit MUST NOT fall below the number of players joined (FR-016).
  - Seat limit = min(`game.max_players`, `table.seats` if set).

## PlaySessionPlayer
- `play_session_id`, `user_id`; unique pair. The host is always a player.
- Joining warns if the user has an overlapping session (FR-008); the user can still confirm.

## State transitions: PlaySession
- `scheduled` → `cancelled` by the host (FR-018), or automatically when the last player (the host) leaves.
- Host edits table, day, start or length: status stays `scheduled`; joined players see the new values.
- Host leaves with others joined: host changes to a chosen joined player; status stays `scheduled`.
- Cancelled sessions free the table slot and stay visible as cancelled.
