import { Bot } from 'grammy';
import * as chrono from 'chrono-node';
import { db, ReminderRow } from '../db/database.js';

const insert = db.prepare(
  `INSERT INTO reminders (telegram_id, chat_id, text, fire_at, created_at)
   VALUES (?, ?, ?, ?, ?)`,
);
const duePending = db.prepare(
  `SELECT * FROM reminders WHERE fired = 0 AND fire_at <= ? ORDER BY fire_at ASC`,
);
const markFired = db.prepare(`UPDATE reminders SET fired = 1 WHERE id = ?`);
const listForUser = db.prepare(
  `SELECT * FROM reminders WHERE telegram_id = ? AND fired = 0 ORDER BY fire_at ASC`,
);
const deleteOne = db.prepare(
  `DELETE FROM reminders WHERE id = ? AND telegram_id = ?`,
);

export interface ParsedReminder {
  fireAt: number;
  text: string;
}

/**
 * Parses natural-language reminders like:
 *   "in 2 hours drink water", "tomorrow at 9am standup", "friday 18:00 gym"
 * Returns null if no time could be understood.
 */
export function parseReminder(input: string, ref = new Date()): ParsedReminder | null {
  const results = chrono.parse(input, ref, { forwardDate: true });
  if (!results.length) return null;
  const r = results[0];
  const fireAt = r.start.date().getTime();
  if (fireAt <= Date.now()) return null;
  // Strip the matched time phrase to leave the reminder body.
  let text = (input.slice(0, r.index) + input.slice(r.index + r.text.length)).trim();
  text = text.replace(/^(to|that|about|:|,|-)\s+/i, '').trim();
  return { fireAt, text: text || 'Reminder' };
}

export function addReminder(
  telegramId: number,
  chatId: number,
  text: string,
  fireAt: number,
): void {
  insert.run(telegramId, chatId, text, fireAt, Date.now());
}

export function userReminders(telegramId: number): ReminderRow[] {
  return listForUser.all(telegramId) as ReminderRow[];
}

export function removeReminder(id: number, telegramId: number): boolean {
  return deleteOne.run(id, telegramId).changes > 0;
}

/**
 * Starts a background loop that fires due reminders.
 * Persisted in SQLite, so reminders survive restarts.
 */
export function startReminderScheduler(bot: Bot, intervalMs = 15_000): void {
  const tick = async () => {
    const due = duePending.all(Date.now()) as ReminderRow[];
    for (const r of due) {
      try {
        await bot.api.sendMessage(r.chat_id, `⏰ Reminder: ${r.text}`);
      } catch (e) {
        console.error('Failed to send reminder', r.id, e);
      } finally {
        markFired.run(r.id);
      }
    }
  };
  setInterval(() => void tick(), intervalMs);
  void tick();
}
