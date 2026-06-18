import { Bot, InlineKeyboard } from 'grammy';
import {
  parseReminder,
  addReminder,
  userReminders,
  removeReminder,
} from '../services/reminderService.js';
import { trackUsage } from '../services/userService.js';

function fmt(ts: number): string {
  return new Date(ts).toLocaleString('en-US', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}

export function registerReminderCommands(bot: Bot): void {
  // /remind in 2 hours drink water
  bot.command('remind', (ctx) => {
    const u = ctx.from;
    if (!u) return;
    const input = ctx.match?.toString().trim();
    if (!input) {
      return ctx.reply(
        'Usage: `/remind <when> <what>`\n\nExamples:\n`/remind in 30 minutes stretch`\n`/remind tomorrow at 9am standup`\n`/remind friday 18:00 gym`',
        { parse_mode: 'Markdown' },
      );
    }
    const parsed = parseReminder(input);
    if (!parsed) {
      return ctx.reply(
        "🤔 I couldn't figure out the time. Try something like `in 2 hours`, `tomorrow at 9am`, or `friday 18:00`.",
        { parse_mode: 'Markdown' },
      );
    }
    addReminder(u.id, ctx.chat.id, parsed.text, parsed.fireAt);
    trackUsage(u.id, u.username);
    return ctx.reply(`✅ Got it. I'll remind you on *${fmt(parsed.fireAt)}*:\n_${parsed.text}_`, {
      parse_mode: 'Markdown',
    });
  });

  // /reminders — list active reminders with delete buttons
  bot.command('reminders', (ctx) => {
    const u = ctx.from;
    if (!u) return;
    const list = userReminders(u.id);
    if (!list.length) return ctx.reply('You have no active reminders. Add one with /remind.');
    const kb = new InlineKeyboard();
    const lines = list.map((r, i) => {
      kb.text(`🗑 ${i + 1}`, `delrem:${r.id}`);
      if ((i + 1) % 4 === 0) kb.row();
      return `*${i + 1}.* ${fmt(r.fire_at)} — ${r.text}`;
    });
    return ctx.reply('*Your reminders:*\n' + lines.join('\n'), {
      parse_mode: 'Markdown',
      reply_markup: kb,
    });
  });

  bot.callbackQuery(/^delrem:(\d+)$/, async (ctx) => {
    const id = Number(ctx.match[1]);
    const ok = removeReminder(id, ctx.from.id);
    await ctx.answerCallbackQuery(ok ? 'Deleted' : 'Not found');
    if (ok) await ctx.editMessageReplyMarkup();
  });
}
