import { Bot, Context } from 'grammy';
import { ensureUser, isPremium, LIMITS } from '../services/userService.js';

export function registerBasicCommands(bot: Bot): void {
  bot.command('start', async (ctx: Context) => {
    const u = ctx.from;
    if (u) ensureUser(u.id, u.username);
    await ctx.reply(
      [
        '👋 *Welcome!* A multi-tool bot with a generous free tier.',
        '',
        '*✨ Generator* — /gen <topic>',
        '_Tip: works inline too — type_ `@thisbot your topic` _in any chat!_',
        '',
        '*⏰ Reminders* (natural language)',
        '/remind in 2 hours drink water · /reminders',
        '',
        '*🧰 Free tools* — /qr <text> · /sd <seconds> <msg>',
        '',
        '*📝 Notes* (synced across devices) — /save · /notes',
        '',
        `Free: *${LIMITS.FREE_GEN_DAILY} generations/day*, *${LIMITS.FREE_MAX_REMINDERS} reminders*, *${LIMITS.FREE_MAX_NOTES} notes*.`,
        'Want more? /upgrade for unlimited + premium-only features.',
      ].join('\n'),
      { parse_mode: 'Markdown' },
    );
  });

  bot.command('help', (ctx) =>
    ctx.reply(
      [
        '*Commands*',
        '/gen <topic> — marketing copy (inline: `@thisbot topic`)',
        '/remind <when> <what> — e.g. `/remind tomorrow at 9am standup`',
        '/reminders — manage reminders',
        '/qr <text> — QR code · /sd <seconds> <msg> — self-destruct',
        '/save <text> · /notes — personal notes',
        '/find <keyword> — search notes _(premium)_',
        '/status — your plan · /upgrade — go premium',
      ].join('\n'),
      { parse_mode: 'Markdown' },
    ),
  );

  bot.command('tools', (ctx) =>
    ctx.reply(
      [
        '*🧰 All tools*',
        '',
        '*✍️ Text & encoding*',
        '/calc · /b64 · /unb64 · /hash · /case · /reverse · /count · /morse · /rot13 · /slug · /json',
        '',
        '*🎲 Generators*',
        '/pw · /uuid · /lorem · /pick · /roll · /flip',
        '',
        '*🔄 Convert & calculate*',
        '/convert · /roman · /base · /bmi · /split · /pct · /age · /datediff · /color · /time',
        '',
        '*✅ Productivity*',
        '/todo · /poll · /countdown · /pomodoro',
        '',
        '*⬇️ Downloaders* (yt-dlp)',
        '/mp3 <url> · /video <url>',
        '',
        '*💎 EVM gems tracker*',
        '/gem <address|symbol> · /scan <address> (safety + buy/hold) · /honeypot <address> · /findtoken <q> · /gems (trending)',
        '',
        '*⏰ Core*',
        '/gen · /remind · /reminders · /qr · /sd · /save · /notes',
        '',
        '*✨ Premium*',
        '/habit · /spend · /expenses · /find · /watch · /watchlist · recurring reminders · unlimited everything',
        '',
        'Tip: most tools show usage if you send them with no arguments.',
      ].join('\n'),
      { parse_mode: 'Markdown' },
    ),
  );

  bot.command('status', (ctx) => {
    const u = ctx.from;
    if (!u) return;
    const user = ensureUser(u.id, u.username);
    if (isPremium(user)) {
      const until = user.premium_until
        ? new Date(user.premium_until).toISOString().slice(0, 10)
        : 'lifetime';
      return ctx.reply(`✨ *Premium active* (until ${until}). Everything unlimited.`, {
        parse_mode: 'Markdown',
      });
    }
    const now = Date.now();
    const used = now >= user.gen_reset_at ? 0 : user.gen_used;
    return ctx.reply(
      `🆓 *Free plan*\nGenerations today: ${Math.max(0, LIMITS.FREE_GEN_DAILY - used)}/${LIMITS.FREE_GEN_DAILY}\nUpgrade for unlimited + premium features → /upgrade`,
      { parse_mode: 'Markdown' },
    );
  });
}
