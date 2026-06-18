import { db, UserRow } from '../db/database.js';

const upsertUser = db.prepare(
  `INSERT INTO users (telegram_id, username, created_at)
   VALUES (?, ?, ?)
   ON CONFLICT(telegram_id) DO UPDATE SET username = excluded.username`,
);
const getUser = db.prepare(`SELECT * FROM users WHERE telegram_id = ?`);
const bumpUsage = db.prepare(
  `UPDATE users SET usage_count = usage_count + 1 WHERE telegram_id = ?`,
);

/** Everything is free and unlimited — we just track users for stats. */
export function ensureUser(telegramId: number, username?: string): UserRow {
  upsertUser.run(telegramId, username ?? null, Date.now());
  return getUser.get(telegramId) as UserRow;
}

export function trackUsage(telegramId: number, username?: string): void {
  ensureUser(telegramId, username);
  bumpUsage.run(telegramId);
}
