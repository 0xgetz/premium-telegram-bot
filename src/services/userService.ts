import { db, UserRow } from '../db/database.js';

const FREE_DAILY_LIMIT = 5;
const DAY_MS = 24 * 60 * 60 * 1000;

const insertUser = db.prepare(
  `INSERT INTO users (telegram_id, username, created_at, daily_reset_at)
   VALUES (?, ?, ?, ?)
   ON CONFLICT(telegram_id) DO UPDATE SET username = excluded.username`,
);
const getUser = db.prepare(`SELECT * FROM users WHERE telegram_id = ?`);
const updateUsage = db.prepare(
  `UPDATE users SET daily_used = ?, daily_reset_at = ? WHERE telegram_id = ?`,
);
const setPremium = db.prepare(
  `UPDATE users SET is_premium = ?, premium_until = ? WHERE telegram_id = ?`,
);

export function ensureUser(telegramId: number, username?: string): UserRow {
  const now = Date.now();
  insertUser.run(telegramId, username ?? null, now, now + DAY_MS);
  return getUser.get(telegramId) as UserRow;
}

export function isPremium(user: UserRow): boolean {
  if (!user.is_premium) return false;
  if (user.premium_until && user.premium_until < Date.now()) {
    setPremium.run(0, null, user.telegram_id);
    return false;
  }
  return true;
}

export interface QuotaResult {
  allowed: boolean;
  remaining: number;
  limit: number;
  premium: boolean;
}

/** Checks the daily quota and consumes one use if allowed. */
export function consumeQuota(telegramId: number, username?: string): QuotaResult {
  const user = ensureUser(telegramId, username);
  if (isPremium(user)) {
    return { allowed: true, remaining: Infinity, limit: Infinity, premium: true };
  }

  const now = Date.now();
  let used = user.daily_used;
  let resetAt = user.daily_reset_at;

  if (now >= resetAt) {
    used = 0;
    resetAt = now + DAY_MS;
  }

  if (used >= FREE_DAILY_LIMIT) {
    updateUsage.run(used, resetAt, telegramId);
    return { allowed: false, remaining: 0, limit: FREE_DAILY_LIMIT, premium: false };
  }

  used += 1;
  updateUsage.run(used, resetAt, telegramId);
  return {
    allowed: true,
    remaining: FREE_DAILY_LIMIT - used,
    limit: FREE_DAILY_LIMIT,
    premium: false,
  };
}

export function grantPremium(telegramId: number, days = 30): void {
  const until = Date.now() + days * DAY_MS;
  setPremium.run(1, until, telegramId);
}

export { FREE_DAILY_LIMIT };
