import { Bot } from 'grammy';
import { config } from '../config.js';
import { db } from '../db/database.js';

const countUsers = db.prepare(`SELECT COUNT(*) AS n FROM users`);
const totalUsage = db.prepare(`SELECT COALESCE(SUM(usage_count), 0) AS n FROM users`);
const pendingReminders = db.prepare(`SELECT COUNT(*) AS n FROM reminders WHERE fired = 0`);
const totalNotes = db.prepare(`SELECT COUNT(*) AS n FROM notes`);

function isAdmin(id?: number): boolean {
  return id !== undefined && config.adminIds.includes(id);
}

export function registerAdminCommands(bot: Bot): void {
  bot.command('stats', (ctx) => {
    if (!isAdmin(ctx.from?.id)) return;
    const users = (countUsers.get() as { n: number }).n;
    const usage = (totalUsage.get() as { n: number }).n;
    const reminders = (pendingReminders.get() as { n: number }).n;
    const notes = (totalNotes.get() as { n: number }).n;
    return ctx.reply(
      `📊 *Stats*\nUsers: ${users}\nTotal actions: ${usage}\nPending reminders: ${reminders}\nSaved notes: ${notes}`,
      { parse_mode: 'Markdown' },
    );
  });
}
