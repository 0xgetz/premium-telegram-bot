import { Bot } from 'grammy';
import { db } from '../db/database.js';
import { isPremiumId } from '../services/userService.js';

const md = { parse_mode: 'Markdown' as const };
const DAY = 86_400_000;

// --- habits ---
const addHabit = db.prepare(`INSERT INTO habits (telegram_id, name, created_at) VALUES (?, ?, ?)`);
const listHabits = db.prepare(`SELECT * FROM habits WHERE telegram_id = ? ORDER BY created_at`);
const getHabit = db.prepare(`SELECT * FROM habits WHERE telegram_id = ? AND lower(name) = lower(?)`);
const updateHabit = db.prepare(`UPDATE habits SET streak = ?, best = ?, last_done = ? WHERE id = ?`);
const delHabit = db.prepare(`DELETE FROM habits WHERE id = ? AND telegram_id = ?`);

// --- expenses ---
const addExpense = db.prepare(`INSERT INTO expenses (telegram_id, amount, note, created_at) VALUES (?, ?, ?, ?)`);
const sumSince = db.prepare(`SELECT COALESCE(SUM(amount),0) AS t, COUNT(*) AS n FROM expenses WHERE telegram_id = ? AND created_at >= ?`);
const recentExpenses = db.prepare(`SELECT amount, note, created_at FROM expenses WHERE telegram_id = ? ORDER BY created_at DESC LIMIT 10`);

interface HabitRow { id: number; name: string; streak: number; best: number; last_done: number | null; }

function premiumGate(ctx: any, feature: string): boolean {
  if (isPremiumId(ctx.from?.id)) return true;
  ctx.reply(`✨ *${feature}* is a premium feature. Unlock it → /upgrade`, md);
  return false;
}

export function registerPremiumTools(bot: Bot): void {
  // /habit add <name> | /habit done <name> | /habit del <name> | /habit
  bot.command('habit', (ctx) => {
    const u = ctx.from;
    if (!u) return;
    if (!premiumGate(ctx, 'Habit tracker')) return;

    const arg = ctx.match?.toString().trim() ?? '';
    const [sub, ...rest] = arg.split(/\s+/);
    const name = rest.join(' ');

    if (sub === 'add') {
      if (!name) return ctx.reply('Usage: `/habit add Meditate`', md);
      addHabit.run(u.id, name, Date.now());
      return ctx.reply(`🌱 Habit added: *${name}*. Check in daily with /habit done ${name}`, md);
    }
    if (sub === 'done') {
      const h = getHabit.get(u.id, name) as HabitRow | undefined;
      if (!h) return ctx.reply('❌ No such habit. Add it with `/habit add <name>`', md);
      const now = Date.now();
      const today = new Date().setHours(0, 0, 0, 0);
      if (h.last_done && h.last_done >= today) return ctx.reply(`✅ Already checked in today. Streak: ${h.streak}🔥`);
      const continued = h.last_done && h.last_done >= today - DAY;
      const streak = continued ? h.streak + 1 : 1;
      const best = Math.max(streak, h.best);
      updateHabit.run(streak, best, now, h.id);
      return ctx.reply(`🔥 *${h.name}* streak: *${streak}* day(s)! (best: ${best})`, md);
    }
    if (sub === 'del') {
      const h = getHabit.get(u.id, name) as HabitRow | undefined;
      if (h) { delHabit.run(h.id, u.id); return ctx.reply('🗑 Habit removed.'); }
      return ctx.reply('❌ No such habit.');
    }

    const rows = listHabits.all(u.id) as HabitRow[];
    if (!rows.length) return ctx.reply('No habits yet. Add one: `/habit add Read 10 pages`', md);
    const lines = rows.map((h) => `• *${h.name}* — ${h.streak}🔥 (best ${h.best})`);
    return ctx.reply('*Your habits:*\n' + lines.join('\n') + '\n\n_Check in:_ `/habit done <name>`', md);
  });

  // /spend <amount> <note>
  bot.command('spend', (ctx) => {
    const u = ctx.from;
    if (!u) return;
    if (!premiumGate(ctx, 'Expense tracker')) return;
    const arg = ctx.match?.toString().trim() ?? '';
    const m = arg.match(/^(\d+(?:\.\d+)?)\s*(.*)$/);
    if (!m) return ctx.reply('Usage: `/spend 12.50 lunch`', md);
    addExpense.run(u.id, parseFloat(m[1]), m[2] || null, Date.now());
    const today = new Date().setHours(0, 0, 0, 0);
    const t = sumSince.get(u.id, today) as { t: number; n: number };
    return ctx.reply(`💸 Logged ${parseFloat(m[1]).toFixed(2)}${m[2] ? ` (${m[2]})` : ''}.\nToday: *${t.t.toFixed(2)}* across ${t.n} item(s).`, md);
  });

  // /expenses — summary
  bot.command('expenses', (ctx) => {
    const u = ctx.from;
    if (!u) return;
    if (!premiumGate(ctx, 'Expense tracker')) return;
    const now = Date.now();
    const today = new Date().setHours(0, 0, 0, 0);
    const d = sumSince.get(u.id, today) as { t: number; n: number };
    const w = sumSince.get(u.id, now - 7 * DAY) as { t: number; n: number };
    const mth = sumSince.get(u.id, now - 30 * DAY) as { t: number; n: number };
    const recent = recentExpenses.all(u.id) as { amount: number; note: string | null; created_at: number }[];
    const list = recent.map((e) => `• ${e.amount.toFixed(2)}${e.note ? ` — ${e.note}` : ''}`).join('\n') || 'none';
    return ctx.reply(
      `💰 *Expenses*\nToday: ${d.t.toFixed(2)}\nLast 7d: ${w.t.toFixed(2)}\nLast 30d: ${mth.t.toFixed(2)}\n\n*Recent:*\n${list}`,
      md,
    );
  });
}
