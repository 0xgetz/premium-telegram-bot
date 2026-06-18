import { Bot } from 'grammy';
import { consumeGenQuota } from '../services/userService.js';
import { generate } from '../services/featureService.js';

export function registerGenerateCommand(bot: Bot): void {
  bot.command('gen', async (ctx) => {
    const u = ctx.from;
    if (!u) return;

    const topic = ctx.match?.toString().trim();
    if (!topic) {
      return ctx.reply('Usage: `/gen <your topic>`', { parse_mode: 'Markdown' });
    }

    const quota = consumeGenQuota(u.id, u.username);
    if (!quota.allowed) {
      return ctx.reply(
        '🚫 You hit your free daily limit (10/day).\n\nUpgrade to *premium* for unlimited generations + 6 multi-tone variants and CTA ideas → /upgrade',
        { parse_mode: 'Markdown' },
      );
    }

    const result = generate(topic, quota.premium);
    const footer = quota.premium
      ? '\n\n✨ Premium • unlimited • multi-tone'
      : `\n\n🆓 ${quota.remaining}/${quota.limit} left today • /upgrade for unlimited + premium variants`;

    await ctx.reply(result.lines.join('\n') + footer, { parse_mode: 'Markdown' });
  });
}
