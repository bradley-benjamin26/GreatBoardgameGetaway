# Feature Specification: Boardgame Weekend Organizer

**Feature Branch**: `001-boardgame-weekend-organizer`

**Created**: 2026-10-15

**Status**: Draft

**Input**: User description: "GreatBoardgameGetaway, an application for my friends to organize playing games at a boardgame weekend. People can create a list of what boardgames they have and/or are bringing and say what they want to play. They can organize a game at various tables that users can generate themselves. Users can input their own data but it should also use the Boardgame Geek API to pull in game data."

## Clarifications

### Session 2026-10-15

- Q: How should attendees identify themselves? → A: Username and password accounts, so one person can use the app on several devices.
- Q: Can sessions cross midnight? → A: Yes; a session may start on one event day and end on the next (at most 24 hours long).
- Q: Who can rename tables? → A: Any signed-in user.
- Q: How should a forgotten password be reset? → A: Each account has an email address, and a reset link is sent to it.
- Q: Who sets up the event (shared sign-up code, event days)? → A: The person deploying the app, in settings, for now; there is no organizer role in the app.
- Q: How should time slots work? → A: Any of the 24 hours of each event day; the host picks a start time and an estimated length in half-hour steps.
- Q: What happens when a session's host steps away? → A: The host can either cancel the session outright (the group decided in person), or leave and hand hosting to another joined player.
- Note: "table" means a physical play location (e.g., basement table); a game played at a table at a scheduled time is a "play session".
- Q: Who is allowed to create an account? → A: Anyone who has the shared event code.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Build my game list (Priority: P1)

An attendee adds boardgames to their personal list and marks each as "I own it", "I'm bringing it", or both. They find a game by searching a public boardgame catalog (BoardGameGeek), which fills in details such as title, player count, play time and cover image. If a game is not found, they enter its details by hand.

**Why this priority**: Everything else depends on knowing which games exist and who has them.

**Independent Test**: A new user adds one game from catalog search and one custom game, marks one as bringing, and sees both on their list with the correct details and flags; the bringing game also appears in the combined games list.

**Acceptance Scenarios**:

1. **Given** an attendee on the add-game screen, **When** they search for a game title and pick a result, **Then** the game is added with its catalog details pre-filled.
2. **Given** a game that is not in the catalog, **When** the attendee enters a title, player range and play time by hand, **Then** the game is added as a custom game.
3. **Given** a game on their list, **When** they toggle "bringing", **Then** the game appears as available at the weekend for everyone.
4. **Given** the catalog is unreachable, **When** the attendee adds a game, **Then** they are told search is unavailable and can still add the game by hand.
5. **Given** several attendees have marked games as bringing, **When** anyone opens the combined games list, **Then** they see each game being brought with title, player range, play time and image where known.

---

### User Story 2 - Say what I want to play (Priority: P2)

An attendee browses the combined games list and marks the ones they want to play. Everyone can see how many people want each game.

**Why this priority**: Interest signals tell the group what to schedule.

**Independent Test**: Two users mark interest in the same game; both see a count of 2 and the names of interested players.

**Acceptance Scenarios**:

1. **Given** the shared game list, **When** an attendee marks a game "want to play", **Then** it appears in their wishlist and the game's interest count rises by one.
2. **Given** a game they marked, **When** they remove the mark, **Then** the count falls by one.
3. **Given** a game nobody is bringing, **When** an attendee views it, **Then** it is clearly shown as unavailable.

---

### User Story 3 - Set up the tables (Priority: P3)

Any attendee can add a table to the event, meaning a real place where games can be played, such as "Basement table" or "Dining room table". They give it a name and may note how many people it seats. Tables can be renamed or removed.

**Why this priority**: Sessions need somewhere to happen before they can be scheduled.

**Independent Test**: A user adds "Basement table" seating 6 and "Dining room table" seating 8, and both appear in the table list for everyone.

**Acceptance Scenarios**:

1. **Given** the tables screen, **When** an attendee adds a table with a name, **Then** it appears in the list for everyone.
2. **Given** an existing table, **When** an attendee renames it, **Then** all sessions at it show the new name.
3. **Given** a table with scheduled sessions, **When** someone tries to remove it, **Then** they are warned that sessions exist and must cancel or move them first.

---

### User Story 4 - Schedule a game at a table (Priority: P4)

An attendee schedules a play session: they pick a game that someone is bringing, a table, and a time slot. Other attendees join or leave the session. The host can also change the table, day, start time or length. The session shows who is playing and how many seats remain.

**Why this priority**: This turns lists, interest and places into an actual schedule.

**Independent Test**: One user schedules a 2-4 player game at the basement table; three others join; a fifth person is refused as full.

**Acceptance Scenarios**:

1. **Given** a game that someone is bringing and a free table, **When** an attendee schedules a session with a time slot, **Then** the session is visible to everyone.
2. **Given** an open session, **When** an attendee joins, **Then** they appear as playing and remaining seats drop by one.
3. **Given** a full session, **When** another attendee tries to join, **Then** they are refused.
4. **Given** a table already booked for that time slot, **When** an attendee tries to schedule another session there, **Then** they are refused and shown the conflict.
5. **Given** a session they host, **When** the host cancels it, **Then** it is cancelled for everyone and joined players see it as cancelled.
6. **Given** a session they host with other players joined, **When** the host leaves and picks a joined player as the new host, **Then** that player becomes host and the session stays scheduled.
7. **Given** a host who is the only player joined, **When** they leave, **Then** the session is cancelled.
8. **Given** a session they host, **When** the host changes its start time or table, **Then** joined players see the new details, unless the change would double-book the table or leave fewer seats than players joined, in which case it is refused.
9. **Given** a free table, **When** an attendee schedules a session at 22:00 for 3 hours, **Then** it runs into the next day and blocks that table until 01:00.

---

### Edge Cases

- Two sessions using the same physical copy of a game at overlapping times.
- Two sessions at the same table at overlapping times, including one that runs past midnight into the next day's session.
- An attendee joined to two sessions with overlapping times.
- The person bringing a game removes it after sessions are already scheduled for it.
- Catalog search returns no results, many results, or is slow.
- Duplicate games added by different attendees (same title, different copies).
- The host of a session leaves it while others have joined.
- A user forgets their password while at the event.
- A user mistypes their email at sign-up and cannot receive a reset link.
- A reset link is used twice, or after it expires.
- The same account is signed in on two devices at once.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Users MUST be able to add a game to their list by searching a public boardgame catalog and selecting a result.
- **FR-002**: Users MUST be able to add a game by entering its details manually when the catalog lacks it or is unavailable.
- **FR-003**: Users MUST be able to mark each game on their list as owned, bringing, or both, and change this at any time.
- **FR-004**: System MUST show all attendees a combined list of games being brought (available as soon as anyone can mark a game as bringing), with title, player range, play time and image where known.
- **FR-005**: Users MUST be able to mark and unmark games they want to play, and see how many people want each game.
- **FR-006**: Users MUST be able to add, rename and remove tables, each with a name and an optional seat count.
- **FR-007**: Users MUST be able to schedule a play session by choosing a game being brought, a table, an event day, a start time and an estimated length.
- **FR-020**: The shared sign-up code and the event days MUST be set by the person deploying the app, outside the app's screens; no in-app organizer role is provided in v1.
- **FR-019**: Start times MUST be selectable at any half-hour across the full 24 hours of an event day, and lengths in half-hour steps; sessions MAY run past midnight into the next day, and a session MUST NOT be longer than 24 hours.
- **FR-008**: System MUST refuse a session that overlaps another at the same table (overlap is judged on actual start and end times, including across midnight), and MUST warn a user who joins a session overlapping one they have already joined.
- **FR-009**: Users MUST be able to join and leave sessions; System MUST refuse joins when full. The seat limit is the game's maximum players, or the table's seat count if smaller.
- **FR-016**: Only a session's host MUST be able to edit (table, day, start time, length) or cancel it; joined players MUST see changes. An edit MUST be refused if it would overlap another session at the table or leave fewer seats than players joined.
- **FR-018**: A host MUST be able to either cancel the session outright, or leave it by naming a joined player as the new host. If no other player has joined, leaving MUST cancel the session.
- **FR-017**: System MUST warn before removing a table that has scheduled sessions.
- **FR-010**: System MUST let a user create an account with a username, an email address and a password, and sign in from any device, so lists, interest and seats follow the person across devices.
- **FR-015**: System MUST require a shared event code to create an account; a wrong code MUST be refused with a clear message.
- **FR-013**: System MUST store passwords only in protected (non-recoverable) form and MUST let a user who forgot their password set a new one through a single-use, time-limited link sent to the email on their account. The response MUST NOT reveal whether an email is registered.
- **FR-021**: The email address MUST be used only for password reset and MUST NOT be shown to other users or shared.
- **FR-014**: System MUST reject duplicate usernames and duplicate email addresses and show a clear message.
- **FR-011**: System MUST keep catalog data it has fetched so repeat views do not depend on the catalog being reachable.
- **FR-012**: System MUST show clear, non-technical messages when the catalog cannot be reached.

### Key Entities

- **Attendee**: A person using the app; has a username, an email (used only for password reset) and owns a game list, interests and seats.
- **Game**: A boardgame with title, player range, play time and image; sourced from the catalog or entered by hand.
- **Listing**: An attendee's relationship to a game: owned, bringing, or both.
- **Interest**: An attendee's "want to play" mark on a game.
- **Table**: A physical place where games are played, with a name and an optional seat count.
- **PlaySession**: A game scheduled at a table on an event day with a start time and estimated length, with a host, a seat limit and the attendees who joined.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: An attendee can add a game from catalog search in under 30 seconds.
- **SC-002**: An attendee can create a table and see it listed in under 1 minute.
- **SC-003**: 90% of first-time users complete "add a game, mark interest, join a table" without help.
- **SC-004**: All core flows are completable on a phone-sized screen without horizontal scrolling.
- **SC-005**: When the catalog is unavailable, 100% of core flows other than catalog search still work.
- **SC-006**: A group of 20 attendees can use the app at once without noticeable slowdown.

## Assumptions

- Users are a small, trusted group of friends (roughly 5–30) for one weekend event at a time.
- Users sign in with a username and password; no social sign-in and no payment. Sign-up is gated by a shared event code that the person running the event shares with friends outside the app.
- A table is a physical location, not a booking. A single event per app instance is in scope; multi-event support is out of scope for v1.
- The event has a fixed set of days, and each day is bookable around the clock in half-hour steps; no calendar sync.
- The deployer provides an outgoing email service so reset links can be sent.
- The public BoardGameGeek catalog is the external dependency for game data; its availability and rate limits are outside our control.
- Only a minimum of personal data (username and email) is stored, per the constitution's privacy principle.
