import Database from 'better-sqlite3';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { config } from '../config.js';

mkdirSync(dirname(config.databasePath), { recursive: true });

export const db = new Database(config.databasePath);
db.pragma('journal_mode = WAL');

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    telegram_id    INTEGER PRIMARY KEY,
    username       TEXT,
    is_premium     INTEGER NOT NULL DEFAULT 0,
    premium_until  INTEGER,
    gen_used       INTEGER NOT NULL DEFAULT 0,
    gen_reset_at   INTEGER NOT NULL DEFAULT 0,
    created_at     INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS payments (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    telegram_id  INTEGER NOT NULL,
    provider     TEXT NOT NULL,
    amount       INTEGER NOT NULL,
    currency     TEXT NOT NULL,
    reference    TEXT,
    created_at   INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS reminders (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    telegram_id  INTEGER NOT NULL,
    chat_id      INTEGER NOT NULL,
    text         TEXT NOT NULL,
    fire_at      INTEGER NOT NULL,
    recurring    TEXT,                 -- null | 'daily' | 'weekly' (premium)
    fired        INTEGER NOT NULL DEFAULT 0,
    created_at   INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS notes (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    telegram_id  INTEGER NOT NULL,
    text         TEXT NOT NULL,
    created_at   INTEGER NOT NULL
  );

  CREATE INDEX IF NOT EXISTS idx_reminders_pending ON reminders (fired, fire_at);
  CREATE INDEX IF NOT EXISTS idx_notes_user ON notes (telegram_id, created_at);
`);

export interface UserRow {
  telegram_id: number;
  username: string | null;
  is_premium: number;
  premium_until: number | null;
  gen_used: number;
  gen_reset_at: number;
  created_at: number;
}

export interface ReminderRow {
  id: number;
  telegram_id: number;
  chat_id: number;
  text: string;
  fire_at: number;
  recurring: string | null;
  fired: number;
  created_at: number;
}

export interface NoteRow {
  id: number;
  telegram_id: number;
  text: string;
  created_at: number;
}
