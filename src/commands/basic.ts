import { Bot, Context } from 'grammy';
import { ensureUser } from '../services/userService.js';

export function registerBasicCommands(bot: Bot): void {
  bot.command('start', async (ctx: Context) => {
    const u = ctx.from;
    if (u) ensureUser(u.id, u.username);
    await ctx.reply(
      [
        '👋 *Welcome!* This bot is *100% free & open-source* — no limits, no paywall.',
        '',
        '*✨ Generator*',
        '/gen <topic> — generate catchy marketing copy',
        '_Tip: works inline too — type_ `@thisbot your topic` _in any chat!_',
        '',
        '*⏰ Reminders* (natural language)',
        '/remind in 2 hours drink water',
        '/reminders — manage them',
        '',
        '*🧰 Handy tools*',
        '/qr <text> — generate a QR code',
        '/sd <seconds> <msg> — self-destructing message',
        '',
        '*📝 Personal notes* (synced across your devices)',
        '/save <anything> · /notes',
        '',
        '/help — show this again',
      ].join('\n'),
      { parse_mode: 'Markdown' },
    );
  });

  bot.command('help', (ctx) =>
    ctx.reply(
      [
        '*Commands*',
        '/gen <topic> — marketing copy (also inline: `@thisbot topic`)',
        '/remind <when> <what> — e.g. `/remind tomorrow at 9am standup`',
        '/reminders — list & delete reminders',
        '/qr <text> — QR code image',
        '/sd <seconds> <msg> — self-destructing message',
        '/save <text> — save a note · /notes — view notes',
        '',
        'Everything is free and unlimited. 💚',
      ].join('\n'),
      { parse_mode: 'Markdown' },
    ),
  );

  bot.command('status', (ctx) => {
    const u = ctx.from;
    if (!u) return;
    const user = ensureUser(u.id, u.username);
    return ctx.reply(
      `💚 *Free plan — unlimited.*\nYou've used the bot *${user.usage_count}* times. Thanks for being here!`,
      { parse_mode: 'Markdown' },
    );
  });
}
