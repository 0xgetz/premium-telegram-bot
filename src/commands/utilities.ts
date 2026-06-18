import { Bot, InputFile } from 'grammy';
import QRCode from 'qrcode';
import { trackUsage } from '../services/userService.js';

export function registerUtilityCommands(bot: Bot): void {
  // /qr <text or url> — generate a QR code image, fully offline
  bot.command('qr', async (ctx) => {
    const u = ctx.from;
    const data = ctx.match?.toString().trim();
    if (!data) {
      return ctx.reply('Usage: `/qr <text or url>`', { parse_mode: 'Markdown' });
    }
    try {
      const buffer = await QRCode.toBuffer(data, {
        type: 'png',
        margin: 2,
        width: 512,
        errorCorrectionLevel: 'M',
      });
      if (u) trackUsage(u.id, u.username);
      await ctx.replyWithPhoto(new InputFile(buffer, 'qr.png'), {
        caption: '🔳 Scan me',
      });
    } catch {
      await ctx.reply('That input is too long to encode as a QR code.');
    }
  });

  // /sd <seconds> <message> — self-destructing message
  bot.command('sd', async (ctx) => {
    const u = ctx.from;
    const raw = ctx.match?.toString().trim() ?? '';
    const m = raw.match(/^(\d+)\s+([\s\S]+)$/);
    if (!m) {
      return ctx.reply('Usage: `/sd <seconds> <message>`\nExample: `/sd 10 this vanishes`', {
        parse_mode: 'Markdown',
      });
    }
    const seconds = Math.min(Math.max(parseInt(m[1], 10), 1), 3600);
    const text = m[2];
    if (u) trackUsage(u.id, u.username);

    const sent = await ctx.reply(`💥 ${text}\n\n_self-destructs in ${seconds}s_`, {
      parse_mode: 'Markdown',
    });
    // Try to delete the user's own command too (works in groups where bot is admin).
    setTimeout(async () => {
      try {
        await ctx.api.deleteMessage(ctx.chat.id, sent.message_id);
        await ctx.api.deleteMessage(ctx.chat.id, ctx.msg!.message_id);
      } catch {
        /* message may already be gone or bot lacks rights */
      }
    }, seconds * 1000);
  });
}
