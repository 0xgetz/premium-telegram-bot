import { Bot } from 'grammy';
import { trackUsage } from '../services/userService.js';
import { generate } from '../services/featureService.js';

export function registerGenerateCommand(bot: Bot): void {
  bot.command('gen', async (ctx) => {
    const u = ctx.from;
    if (!u) return;

    const topic = ctx.match?.toString().trim();
    if (!topic) {
      return ctx.reply('Usage: `/gen <your topic>`', { parse_mode: 'Markdown' });
    }

    trackUsage(u.id, u.username);
    const result = generate(topic, true); // everything unlocked, free
    await ctx.reply(result.lines.join('\n') + '\n\n💚 100% free & unlimited');
  });
}
