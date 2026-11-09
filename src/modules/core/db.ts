import Database from "better-sqlite3"
import { mkdirSync } from "fs"
import { dirname } from "path"
import { paths } from "./config"

/**
 * Ordered schema migrations. The index + 1 is stored in PRAGMA user_version,
 * so only append to this list, never edit an entry that has shipped.
 */
const migrations: string[] = [
  `
  CREATE TABLE event (
    id               INTEGER PRIMARY KEY CHECK (id = 1),
    name             TEXT NOT NULL,
    welcome_message  TEXT NOT NULL DEFAULT '',
    guest_token      TEXT NOT NULL,
    uploads_open     INTEGER NOT NULL DEFAULT 1,
    gallery_open     INTEGER NOT NULL DEFAULT 1,
    updated_at       TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
  );

  CREATE TABLE media (
    id             TEXT PRIMARY KEY,
    kind           TEXT NOT NULL CHECK (kind IN ('photo', 'video')),
    status         TEXT NOT NULL CHECK (status IN ('processing', 'ready', 'failed')),
    guest_name     TEXT,
    device_id      TEXT,
    original_name  TEXT,
    mime           TEXT NOT NULL,
    size           INTEGER NOT NULL,
    width          INTEGER,
    height         INTEGER,
    duration       REAL,
    original_file  TEXT NOT NULL,
    display_file   TEXT,
    thumb_file     TEXT,
    hidden         INTEGER NOT NULL DEFAULT 0,
    created_at     TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
  );
  CREATE INDEX media_created ON media (created_at DESC);

  CREATE TABLE upload (
    id             TEXT PRIMARY KEY,
    kind           TEXT NOT NULL,
    mime           TEXT NOT NULL,
    size           INTEGER NOT NULL,
    original_name  TEXT,
    guest_name     TEXT,
    device_id      TEXT,
    created_at     TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
  );
  `,
]

function migrate(db: Database.Database) {
  const current = db.pragma("user_version", { simple: true }) as number
  for (let i = current; i < migrations.length; i++) {
    db.transaction(() => {
      db.exec(migrations[i])
      db.pragma(`user_version = ${i + 1}`)
    })()
  }
}

function open(): Database.Database {
  mkdirSync(dirname(paths.db), { recursive: true })
  const db = new Database(paths.db)
  db.pragma("journal_mode = WAL")
  db.pragma("busy_timeout = 5000")
  db.pragma("foreign_keys = ON")
  migrate(db)
  return db
}

const globalForDb = globalThis as unknown as { momentcapDb?: Database.Database }

export function db(): Database.Database {
  if (!globalForDb.momentcapDb) globalForDb.momentcapDb = open()
  return globalForDb.momentcapDb
}

/** Test helper: close and forget the connection so DATA_DIR can change. */
export function resetDbForTests() {
  globalForDb.momentcapDb?.close()
  globalForDb.momentcapDb = undefined
}
