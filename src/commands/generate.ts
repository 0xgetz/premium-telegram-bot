import { Bot } from 'grammy';
import { consumeQuota } from '../services/userService.js';
import { generate } from '../services/featureService.js';

export function registerGenerateCommand(bot: Bot): void {
  bot.command('gen', async (ctx) => {
    const u = ctx.from;
    if (!u) return;

    const topic = ctx.match?.toString().trim();
    if (!topic) {
      return ctx.reply('Usage: `/gen <your topic>`', { parse_mode: 'Markdown' });
    }

    const quota = consumeQuota(u.id, u.username);
    if (!quota.allowed) {
      return ctx.reply(
        '🚫 You hit your free daily limit.\n\nUpgrade to *premium* for unlimited generations and extra variants → /upgrade',
        { parse_mode: 'Markdown' },
      );
    }

    const result = generate(topic, quota.premium);
    const footer = quota.premium
      ? '\n\n✨ Premium • unlimited'
      : `\n\n🆓 ${quota.remaining}/${quota.limit} left today • /upgrade for unlimited`;

    await ctx.reply(result.lines.join('\n') + footer);
  });
}
