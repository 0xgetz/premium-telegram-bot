import { db, UserRow } from '../db/database.js';

// Generous free limits so users are happy; premium removes them entirely.
export const LIMITS = {
  FREE_GEN_DAILY: 10,
  FREE_MAX_REMINDERS: 5,
  FREE_MAX_NOTES: 20,
  FREE_INLINE_RESULTS: 3,
  PREMIUM_INLINE_RESULTS: 10,
};

const DAY_MS = 24 * 60 * 60 * 1000;

const upsertUser = db.prepare(
  `INSERT INTO users (telegram_id, username, created_at, gen_reset_at)
   VALUES (?, ?, ?, ?)
   ON CONFLICT(telegram_id) DO UPDATE SET username = excluded.username`,
);
const getUser = db.prepare(`SELECT * FROM users WHERE telegram_id = ?`);
const updateGen = db.prepare(
  `UPDATE users SET gen_used = ?, gen_reset_at = ? WHERE telegram_id = ?`,
);
const setPremium = db.prepare(
  `UPDATE users SET is_premium = ?, premium_until = ? WHERE telegram_id = ?`,
);

export function ensureUser(telegramId: number, username?: string): UserRow {
  const now = Date.now();
  upsertUser.run(telegramId, username ?? null, now, now + DAY_MS);
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

export function isPremiumId(telegramId: number): boolean {
  const u = getUser.get(telegramId) as UserRow | undefined;
  return u ? isPremium(u) : false;
}

export interface QuotaResult {
  allowed: boolean;
  remaining: number;
  limit: number;
  premium: boolean;
}

/** Daily quota for /gen. Premium = unlimited. */
export function consumeGenQuota(telegramId: number, username?: string): QuotaResult {
  const user = ensureUser(telegramId, username);
  if (isPremium(user)) {
    return { allowed: true, remaining: Infinity, limit: Infinity, premium: true };
  }

  const now = Date.now();
  let used = user.gen_used;
  let resetAt = user.gen_reset_at;
  if (now >= resetAt) {
    used = 0;
    resetAt = now + DAY_MS;
  }

  if (used >= LIMITS.FREE_GEN_DAILY) {
    updateGen.run(used, resetAt, telegramId);
    return { allowed: false, remaining: 0, limit: LIMITS.FREE_GEN_DAILY, premium: false };
  }

  used += 1;
  updateGen.run(used, resetAt, telegramId);
  return {
    allowed: true,
    remaining: LIMITS.FREE_GEN_DAILY - used,
    limit: LIMITS.FREE_GEN_DAILY,
    premium: false,
  };
}

export function grantPremium(telegramId: number, days = 30): void {
  setPremium.run(1, Date.now() + days * DAY_MS, telegramId);
}
