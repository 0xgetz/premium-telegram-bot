import { Bot } from 'grammy';
import { config } from '../config.js';
import { db } from '../db/database.js';
import { grantPremium } from '../services/userService.js';

const countUsers = db.prepare(`SELECT COUNT(*) AS n FROM users`);
const countPremium = db.prepare(
  `SELECT COUNT(*) AS n FROM users WHERE is_premium = 1 AND (premium_until IS NULL OR premium_until > ?)`,
);
const revenue = db.prepare(
  `SELECT provider, SUM(amount) AS total, currency FROM payments GROUP BY provider, currency`,
);

function isAdmin(id?: number): boolean {
  return id !== undefined && config.adminIds.includes(id);
}

export function registerAdminCommands(bot: Bot): void {
  bot.command('stats', (ctx) => {
    if (!isAdmin(ctx.from?.id)) return;
    const users = (countUsers.get() as { n: number }).n;
    const premium = (countPremium.get(Date.now()) as { n: number }).n;
    const rows = revenue.all() as { provider: string; total: number; currency: string }[];
    const rev = rows.map((r) => `  ${r.provider}: ${r.total} ${r.currency}`).join('\n') || '  none yet';
    return ctx.reply(
      `📊 *Stats*\nUsers: ${users}\nActive premium: ${premium}\n\n*Revenue:*\n${rev}`,
      { parse_mode: 'Markdown' },
    );
  });

  bot.command('grant', (ctx) => {
    if (!isAdmin(ctx.from?.id)) return;
    const parts = ctx.match?.toString().trim().split(/\s+/) ?? [];
    const target = Number(parts[0]);
    const days = Number(parts[1] ?? 30);
    if (!target) return ctx.reply('Usage: /grant <telegram_id> [days]');
    grantPremium(target, days);
    return ctx.reply(`✅ Granted ${days} days of premium to ${target}.`);
  });
}
