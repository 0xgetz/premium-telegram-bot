import { Bot, InlineKeyboard } from 'grammy';
import * as chrono from 'chrono-node';
import { db } from '../db/database.js';
import { isPremiumId } from '../services/userService.js';

const md = { parse_mode: 'Markdown' as const };
const FREE_MAX_TODOS = 15;

const addTodo = db.prepare(`INSERT INTO todos (telegram_id, text, created_at) VALUES (?, ?, ?)`);
const listTodos = db.prepare(`SELECT * FROM todos WHERE telegram_id = ? ORDER BY done, created_at`);
const countTodos = db.prepare(`SELECT COUNT(*) AS n FROM todos WHERE telegram_id = ? AND done = 0`);
const setDone = db.prepare(`UPDATE todos SET done = 1 WHERE id = ? AND telegram_id = ?`);
const delTodo = db.prepare(`DELETE FROM todos WHERE id = ? AND telegram_id = ?`);
const clearDone = db.prepare(`DELETE FROM todos WHERE telegram_id = ? AND done = 1`);

interface Todo { id: number; text: string; done: number; }

function renderTodos(telegramId: number) {
  const rows = listTodos.all(telegramId) as Todo[];
  if (!rows.length) return { text: '📝 No tasks. Add one: `/todo add buy milk`', kb: undefined };
  const kb = new InlineKeyboard();
  const lines = rows.map((r, i) => {
    if (!r.done) {
      kb.text(`✅ ${i + 1}`, `td_done:${r.id}`);
      if ((i + 1) % 4 === 0) kb.row();
    }
    return `${r.done ? '☑️ ~' : '⬜️ '}${i + 1}. ${r.text}${r.done ? '~' : ''}`;
  });
  kb.row().text('🧹 Clear done', 'td_clear');
  return { text: '*Your to-do list:*\n' + lines.join('\n'), kb };
}

export function registerProductivity(bot: Bot): void {
  bot.command('todo', (ctx) => {
    const u = ctx.from;
    if (!u) return;
    const arg = ctx.match?.toString().trim() ?? '';
    const [sub, ...rest] = arg.split(/\s+/);
    const body = rest.join(' ');

    if (sub === 'add') {
      if (!body) return ctx.reply('Usage: `/todo add <task>`', md);
      if (!isPremiumId(u.id) && (countTodos.get(u.id) as { n: number }).n >= FREE_MAX_TODOS) {
        return ctx.reply(`🚫 Free plan holds ${FREE_MAX_TODOS} open tasks. Finish some or /upgrade for unlimited.`);
      }
      addTodo.run(u.id, body, Date.now());
      return ctx.reply('➕ Added.');
    }
    if (sub === 'done') {
      const rows = listTodos.all(u.id) as Todo[];
      const idx = parseInt(body, 10) - 1;
      if (rows[idx]) { setDone.run(rows[idx].id, u.id); return ctx.reply('✅ Done!'); }
      return ctx.reply('Usage: `/todo done <number>`', md);
    }
    if (sub === 'del') {
      const rows = listTodos.all(u.id) as Todo[];
      const idx = parseInt(body, 10) - 1;
      if (rows[idx]) { delTodo.run(rows[idx].id, u.id); return ctx.reply('🗑 Deleted.'); }
      return ctx.reply('Usage: `/todo del <number>`', md);
    }
    const { text, kb } = renderTodos(u.id);
    return ctx.reply(text, { ...md, reply_markup: kb });
  });

  bot.callbackQuery(/^td_done:(\d+)$/, async (ctx) => {
    setDone.run(Number(ctx.match[1]), ctx.from.id);
    await ctx.answerCallbackQuery('Done!');
    const { text, kb } = renderTodos(ctx.from.id);
    await ctx.editMessageText(text, { ...md, reply_markup: kb });
  });
  bot.callbackQuery('td_clear', async (ctx) => {
    clearDone.run(ctx.from.id);
    await ctx.answerCallbackQuery('Cleared completed');
    const { text, kb } = renderTodos(ctx.from.id);
    await ctx.editMessageText(text, { ...md, reply_markup: kb });
  });

  // Native poll: /poll Question | Opt A | Opt B | Opt C
  bot.command('poll', async (ctx) => {
    const parts = (ctx.match?.toString() ?? '').split('|').map((s) => s.trim()).filter(Boolean);
    if (parts.length < 3) return ctx.reply('Usage: `/poll Question | Option A | Option B`', md);
    const [q, ...opts] = parts;
    await ctx.replyWithPoll(q, opts.slice(0, 10).map((text) => ({ text })), { is_anonymous: false });
  });

  // Countdown to a date/time
  bot.command('countdown', (ctx) => {
    const t = ctx.match?.toString().trim() ?? '';
    const res = chrono.parse(t, new Date(), { forwardDate: true });
    if (!res.length) return ctx.reply('Usage: `/countdown 2026-12-31 New Year`', md);
    const target = res[0].start.date().getTime();
    const name = (t.slice(0, res[0].index) + t.slice(res[0].index + res[0].text.length)).trim() || 'that';
    const diff = target - Date.now();
    if (diff <= 0) return ctx.reply('⏳ That moment has already passed.');
    const d = Math.floor(diff / 86400000);
    const h = Math.floor((diff % 86400000) / 3600000);
    const m = Math.floor((diff % 3600000) / 60000);
    return ctx.reply(`⏳ *${name}* in *${d}d ${h}h ${m}m*`, md);
  });

  // Pomodoro focus timer (25 min focus + 5 min break)
  bot.command('pomodoro', async (ctx) => {
    const chatId = ctx.chat.id;
    await ctx.reply('🍅 Pomodoro started — *25 min focus*. Go!', md);
    setTimeout(() => {
      ctx.api.sendMessage(chatId, '✅ Focus done! Take a *5 min break* ☕', md).catch(() => {});
      setTimeout(() => {
        ctx.api.sendMessage(chatId, '🔔 Break over — ready for another round? /pomodoro').catch(() => {});
      }, 5 * 60 * 1000);
    }, 25 * 60 * 1000);
  });
}
