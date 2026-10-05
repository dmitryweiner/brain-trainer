-- Sync log (PLAN-IMPROVEMENTS.md, 6.3). `user` is hex SHA-256 of the client's
-- anonymous key; the key itself never reaches the database. Events are
-- immutable, unique per (user, id); `seq` is the download cursor.
-- Quotas count NEW events only, so resending an event always works.
-- (CASE ... END is parenthesized inside triggers: wrangler's statement
-- splitter would otherwise take "END;" for the end of the trigger.)
CREATE TABLE events (
 seq INTEGER PRIMARY KEY AUTOINCREMENT,
 user TEXT NOT NULL,
 id TEXT NOT NULL,
 kind TEXT NOT NULL,
 body TEXT NOT NULL,
 created REAL NOT NULL,
 UNIQUE (user, id)
);
-- statement-breakpoint
CREATE INDEX events_user_seq ON events (user, seq);
-- statement-breakpoint
CREATE TABLE users (
 user TEXT PRIMARY KEY,
 events INTEGER NOT NULL,
 bytes INTEGER NOT NULL,
 created REAL NOT NULL,
 seen REAL NOT NULL
);
-- statement-breakpoint
CREATE TABLE daily (day INTEGER PRIMARY KEY, count INTEGER NOT NULL);
-- statement-breakpoint
CREATE TRIGGER events_quota BEFORE INSERT ON events
WHEN NOT EXISTS (SELECT 1 FROM events WHERE user = NEW.user AND id = NEW.id)
BEGIN
 SELECT (CASE WHEN COALESCE((SELECT events FROM users WHERE user = NEW.user), 0) >= 50000
   THEN RAISE(ABORT, 'key_quota') END);
 SELECT (CASE WHEN COALESCE((SELECT count FROM daily WHERE day = CAST(NEW.created / 86400 AS INTEGER)), 0) >= 10000
   THEN RAISE(ABORT, 'daily_quota') END);
END;
-- statement-breakpoint
CREATE TRIGGER events_count AFTER INSERT ON events BEGIN
 INSERT INTO users VALUES (NEW.user, 1, length(NEW.body), NEW.created, NEW.created)
 ON CONFLICT(user) DO UPDATE SET events = events + 1, bytes = bytes + length(NEW.body), seen = NEW.created;
 INSERT INTO daily VALUES (CAST(NEW.created / 86400 AS INTEGER), 1)
 ON CONFLICT(day) DO UPDATE SET count = count + 1;
END;
