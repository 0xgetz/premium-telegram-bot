import { Bot } from 'grammy';
import * as chrono from 'chrono-node';
import { db, ReminderRow } from '../db/database.js';

const DAY_MS = 24 * 60 * 60 * 1000;
const WEEK_MS = 7 * DAY_MS;

const insert = db.prepare(
  `INSERT INTO reminders (telegram_id, chat_id, text, fire_at, recurring, created_at)
   VALUES (?, ?, ?, ?, ?, ?)`,
);
const duePending = db.prepare(
  `SELECT * FROM reminders WHERE fired = 0 AND fire_at <= ? ORDER BY fire_at ASC`,
);
const markFired = db.prepare(`UPDATE reminders SET fired = 1 WHERE id = ?`);
const reschedule = db.prepare(`UPDATE reminders SET fire_at = ? WHERE id = ?`);
const listForUser = db.prepare(
  `SELECT * FROM reminders WHERE telegram_id = ? AND fired = 0 ORDER BY fire_at ASC`,
);
const countForUser = db.prepare(
  `SELECT COUNT(*) AS n FROM reminders WHERE telegram_id = ? AND fired = 0`,
);
const deleteOne = db.prepare(`DELETE FROM reminders WHERE id = ? AND telegram_id = ?`);

export type Recurring = 'daily' | 'weekly' | null;

export interface ParsedReminder {
  fireAt: number;
  text: string;
  recurring: Recurring;
}

/**
 * Parses natural-language reminders like:
 *   "in 2 hours drink water", "tomorrow at 9am standup", "every day 8am vitamins"
 * Detects 'every day'/'daily' and 'every week'/'weekly' for recurring (premium).
 */
export function parseReminder(input: string, ref = new Date()): ParsedReminder | null {
  let recurring: Recurring = null;
  let cleaned = input;
  if (/\b(every\s*day|daily)\b/i.test(input)) {
    recurring = 'daily';
    cleaned = input.replace(/\b(every\s*day|daily)\b/i, '').trim();
  } else if (/\b(every\s*week|weekly)\b/i.test(input)) {
    recurring = 'weekly';
    cleaned = input.replace(/\b(every\s*week|weekly)\b/i, '').trim();
  }

  const results = chrono.parse(cleaned, ref, { forwardDate: true });
  if (!results.length) return null;
  const r = results[0];
  const fireAt = r.start.date().getTime();
  if (fireAt <= Date.now()) return null;

  let text = (cleaned.slice(0, r.index) + cleaned.slice(r.index + r.text.length)).trim();
  text = text.replace(/^(to|that|about|:|,|-)\s+/i, '').trim();
  return { fireAt, text: text || 'Reminder', recurring };
}

export function addReminder(
  telegramId: number,
  chatId: number,
  text: string,
  fireAt: number,
  recurring: Recurring = null,
): void {
  insert.run(telegramId, chatId, text, fireAt, recurring, Date.now());
}

export function userReminders(telegramId: number): ReminderRow[] {
  return listForUser.all(telegramId) as ReminderRow[];
}

export function activeReminderCount(telegramId: number): number {
  return (countForUser.get(telegramId) as { n: number }).n;
}

export function removeReminder(id: number, telegramId: number): boolean {
  return deleteOne.run(id, telegramId).changes > 0;
}

/** Background loop firing due reminders; recurring ones get rescheduled. */
export function startReminderScheduler(bot: Bot, intervalMs = 15_000): void {
  const tick = async () => {
    const due = duePending.all(Date.now()) as ReminderRow[];
    for (const r of due) {
      try {
        const tag = r.recurring ? ` (${r.recurring})` : '';
        await bot.api.sendMessage(r.chat_id, `⏰ Reminder${tag}: ${r.text}`);
      } catch (e) {
        console.error('Failed to send reminder', r.id, e);
      }
      if (r.recurring === 'daily') {
        reschedule.run(r.fire_at + DAY_MS, r.id);
      } else if (r.recurring === 'weekly') {
        reschedule.run(r.fire_at + WEEK_MS, r.id);
      } else {
        markFired.run(r.id);
      }
    }
  };
  setInterval(() => void tick(), intervalMs);
  void tick();
}
