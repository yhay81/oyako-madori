CREATE TABLE product_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL CHECK (name IN ('visited','directory_searched','room_opened','source_opened','favorite_added','favorite_removed','compare_opened','returned')),
  session_id TEXT NOT NULL,
  room_id TEXT,
  day TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  is_qa INTEGER NOT NULL DEFAULT 0 CHECK (is_qa IN (0,1))
);

CREATE INDEX product_events_metrics ON product_events(is_qa, name, day, session_id);
CREATE INDEX product_events_retention ON product_events(created_at);
