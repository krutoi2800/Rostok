CREATE TABLE IF NOT EXISTS members (
  id TEXT PRIMARY KEY,
  token_hash TEXT UNIQUE NOT NULL
);
CREATE TABLE IF NOT EXISTS friendships (
  a TEXT NOT NULL REFERENCES members(id),
  b TEXT NOT NULL REFERENCES members(id),
  sender TEXT NOT NULL,
  status TEXT NOT NULL CHECK(status IN ('pending','accepted')),
  PRIMARY KEY(a,b), CHECK(a < b), CHECK(sender = a OR sender = b)
);
CREATE INDEX IF NOT EXISTS by_recipient ON friendships(b);
