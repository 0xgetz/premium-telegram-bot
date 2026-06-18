import { Bot, InlineKeyboard } from 'grammy';
import {
  parseReminder,
  addReminder,
  userReminders,
  removeReminder,
  activeReminderCount,
} from '../services/reminderService.js';
import { ensureUser, isPremium, LIMITS } from '../services/userService.js';

function fmt(ts: number): string {
  return new Date(ts).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' });
}

export function registerReminderCommands(bot: Bot): void {
  bot.command('remind', (ctx) => {
    const u = ctx.from;
    if (!u) return;
    const input = ctx.match?.toString().trim();
    if (!input) {
      return ctx.reply(
        'Usage: `/remind <when> <what>`\n\nExamples:\n`/remind in 30 minutes stretch`\n`/remind tomorrow at 9am standup`\n`/remind every day 8am vitamins` _(premium)_',
        { parse_mode: 'Markdown' },
      );
    }
    const parsed = parseReminder(input);
    if (!parsed) {
      return ctx.reply(
        "🤔 I couldn't figure out the time. Try `in 2 hours`, `tomorrow at 9am`, or `friday 18:00`.",
        { parse_mode: 'Markdown' },
      );
    }

    const user = ensureUser(u.id, u.username);
    const premium = isPremium(user);

    if (parsed.recurring && !premium) {
      return ctx.reply(
        '🔁 *Recurring reminders are a premium feature.*\nUpgrade to set daily/weekly reminders → /upgrade',
        { parse_mode: 'Markdown' },
      );
    }
    if (!premium && activeReminderCount(u.id) >= LIMITS.FREE_MAX_REMINDERS) {
      return ctx.reply(
        `🚫 Free plan allows ${LIMITS.FREE_MAX_REMINDERS} active reminders. Delete one with /reminders or go unlimited → /upgrade`,
      );
    }

    addReminder(u.id, ctx.chat.id, parsed.text, parsed.fireAt, parsed.recurring);
    const rec = parsed.recurring ? ` _(repeats ${parsed.recurring})_` : '';
    return ctx.reply(`✅ I'll remind you on *${fmt(parsed.fireAt)}*${rec}:\n_${parsed.text}_`, {
      parse_mode: 'Markdown',
    });
  });

  bot.command('reminders', (ctx) => {
    const u = ctx.from;
    if (!u) return;
    const list = userReminders(u.id);
    if (!list.length) return ctx.reply('You have no active reminders. Add one with /remind.');
    const kb = new InlineKeyboard();
    const lines = list.map((r, i) => {
      kb.text(`🗑 ${i + 1}`, `delrem:${r.id}`);
      if ((i + 1) % 4 === 0) kb.row();
      const rec = r.recurring ? ` 🔁${r.recurring}` : '';
      return `*${i + 1}.* ${fmt(r.fire_at)}${rec} — ${r.text}`;
    });
    return ctx.reply('*Your reminders:*\n' + lines.join('\n'), {
      parse_mode: 'Markdown',
      reply_markup: kb,
    });
  });

  bot.callbackQuery(/^delrem:(\d+)$/, async (ctx) => {
    const ok = removeReminder(Number(ctx.match[1]), ctx.from.id);
    await ctx.answerCallbackQuery(ok ? 'Deleted' : 'Not found');
    if (ok) await ctx.editMessageReplyMarkup();
  });
}
