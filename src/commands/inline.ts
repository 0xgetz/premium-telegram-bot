import { Bot } from 'grammy';
import { generate } from '../services/featureService.js';
import { isPremiumId, LIMITS } from '../services/userService.js';

/**
 * Inline mode lets users call the bot in ANY chat by typing:
 *   @your_bot launching my coffee app
 * Premium users get more result variants.
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

    const premium = ctx.from ? isPremiumId(ctx.from.id) : false;
    const max = premium ? LIMITS.PREMIUM_INLINE_RESULTS : LIMITS.FREE_INLINE_RESULTS;

    // Generate premium-style lines, then cap by tier. Strip markdown for inline.
    const { lines } = generate(q, true);
    const results = lines
      .map((l) => l.replace(/\*/g, '').replace(/^[^:]+:\s*/, '').trim())
      .filter(Boolean)
      .slice(0, max)
      .map((line, i) => ({
        type: 'article' as const,
        id: String(i),
        title: line.length > 60 ? line.slice(0, 57) + '…' : line,
        description: premium ? 'Tap to send' : 'Free preview · /upgrade for more',
        input_message_content: { message_text: line },
      }));

    await ctx.answerInlineQuery(results, {
      cache_time: 5,
      button: premium
        ? undefined
        : { text: '✨ Upgrade for 10 variants', start_parameter: 'upgrade' },
    });
  });
}
