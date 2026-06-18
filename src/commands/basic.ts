import { Bot, Context } from 'grammy';
import { ensureUser, isPremium, FREE_DAILY_LIMIT } from '../services/userService.js';

export function registerBasicCommands(bot: Bot): void {
  bot.command('start', async (ctx: Context) => {
    const u = ctx.from;
    if (u) ensureUser(u.id, u.username);
    await ctx.reply(
      [
        '👋 *Welcome!*',
        '',
        'This bot generates catchy marketing copy for any topic.',
        '',
        '*Commands:*',
        '/gen <topic> — generate copy',
        '/status — see your plan & remaining uses',
        '/upgrade — unlock unlimited + premium variants',
        '/help — show this message',
        '',
        `Free plan: *${FREE_DAILY_LIMIT} generations/day*. Premium: *unlimited*.`,
      ].join('\n'),
      { parse_mode: 'Markdown' },
    );
  });

  bot.command('help', (ctx) =>
    ctx.reply(
      [
        '*How to use:*',
        '`/gen launching my coffee app`',
        '',
        '/status — your plan',
        '/upgrade — go premium',
      ].join('\n'),
      { parse_mode: 'Markdown' },
    ),
  );

  bot.command('status', (ctx) => {
    const u = ctx.from;
    if (!u) return;
    const user = ensureUser(u.id, u.username);
    const premium = isPremium(user);
    if (premium) {
      const until = user.premium_until
        ? new Date(user.premium_until).toISOString().slice(0, 10)
        : 'lifetime';
      return ctx.reply(`✨ *Premium active* (until ${until}). Unlimited usage.`, {
        parse_mode: 'Markdown',
      });
    }
    const now = Date.now();
    const used = now >= user.daily_reset_at ? 0 : user.daily_used;
    return ctx.reply(
      `🆓 *Free plan* — ${Math.max(0, FREE_DAILY_LIMIT - used)}/${FREE_DAILY_LIMIT} generations left today.\nUse /upgrade for unlimited access.`,
      { parse_mode: 'Markdown' },
    );
  });
}
