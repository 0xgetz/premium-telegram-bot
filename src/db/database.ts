import Database from 'better-sqlite3';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { config } from '../config.js';

mkdirSync(dirname(config.databasePath), { recursive: true });

export const db = new Database(config.databasePath);
db.pragma('journal_mode = WAL');

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    telegram_id      INTEGER PRIMARY KEY,
    username         TEXT,
    is_premium       INTEGER NOT NULL DEFAULT 0,
    premium_until    INTEGER,
    daily_used       INTEGER NOT NULL DEFAULT 0,
    daily_reset_at   INTEGER NOT NULL DEFAULT 0,
    created_at       INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS payments (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    telegram_id   INTEGER NOT NULL,
    provider      TEXT NOT NULL,
    amount        INTEGER NOT NULL,
    currency      TEXT NOT NULL,
    reference     TEXT,
    created_at    INTEGER NOT NULL
  );
`);

export interface UserRow {
  telegram_id: number;
  username: string | null;
  is_premium: number;
  premium_until: number | null;
  daily_used: number;
  daily_reset_at: number;
  created_at: number;
}
