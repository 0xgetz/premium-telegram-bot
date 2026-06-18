import { Bot } from 'grammy';
import { generate } from '../services/featureService.js';
import { trackUsage } from '../services/userService.js';

/**
 * Inline mode lets users call the bot in ANY chat by typing:
 *   @your_bot launching my coffee app
 * Telegram shows generated results they can tap to send — no need to open the
 * bot's own chat. This is rare and makes the bot useful everywhere.
 */
export function registerInlineMode(bot: Bot): void {
  bot.on('inline_query', async (ctx) => {
    const q = ctx.inlineQuery.query.trim();
    if (!q) {
      return ctx.answerInlineQuery([], {
        cache_time: 1,
        button: { text: 'Type a topic to generate copy…', start_parameter: 'start' },
      });
    }

    const { lines } = generate(q, true);
    if (ctx.from) trackUsage(ctx.from.id, ctx.from.username);

    const results = lines
      .filter((l) => l.trim())
      .slice(0, 10)
      .map((line, i) => ({
        type: 'article' as const,
        id: String(i),
        title: line.length > 60 ? line.slice(0, 57) + '…' : line,
        description: 'Tap to send',
        input_message_content: { message_text: line },
      }));

    await ctx.answerInlineQuery(results, { cache_time: 5 });
  });
}
