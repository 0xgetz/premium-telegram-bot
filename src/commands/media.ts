import { Bot, InputFile } from 'grammy';
import { statSync } from 'node:fs';
import { consumeGenQuota } from '../services/userService.js';
import { downloadAudio, downloadVideo, cleanup, isUrl, MAX_BYTES } from '../services/mediaService.js';

const md = { parse_mode: 'Markdown' as const };

const DISCLAIMER =
  '_Only download content you have the right to. Respect copyright and each platform\'s Terms of Service._';

export function registerMediaCommands(bot: Bot): void {
  // /mp3 <url> — music / audio downloader
  bot.command('mp3', async (ctx) => {
    const u = ctx.from;
    if (!u) return;
    const url = ctx.match?.toString().trim();
    if (!url || !isUrl(url)) {
      return ctx.reply('🎵 Usage: `/mp3 <video or track url>`\n' + DISCLAIMER, md);
    }
    const quota = consumeGenQuota(u.id, u.username); // downloads share the daily quota
    if (!quota.allowed) {
      return ctx.reply('🚫 Daily free limit reached. /upgrade for unlimited downloads.');
    }
    const status = await ctx.reply('🎵 Fetching audio…');
    try {
      const { path, dir, title } = await downloadAudio(url);
      if (statSync(path).size > MAX_BYTES) {
        cleanup(dir);
        await ctx.api.editMessageText(ctx.chat.id, status.message_id, '❌ Audio is larger than the size limit.');
        return;
      }
      await ctx.replyWithAudio(new InputFile(path), { title, caption: `🎵 ${title}` });
      cleanup(dir);
      await ctx.api.deleteMessage(ctx.chat.id, status.message_id).catch(() => {});
    } catch (e) {
      await ctx.api.editMessageText(ctx.chat.id, status.message_id, '❌ ' + (e as Error).message);
    }
  });

  // /video <url> — video downloader
  bot.command('video', async (ctx) => {
    const u = ctx.from;
    if (!u) return;
    const url = ctx.match?.toString().trim();
    if (!url || !isUrl(url)) {
      return ctx.reply('🎬 Usage: `/video <url>`\n' + DISCLAIMER, md);
    }
    const quota = consumeGenQuota(u.id, u.username);
    if (!quota.allowed) {
      return ctx.reply('🚫 Daily free limit reached. /upgrade for unlimited downloads.');
    }
    const status = await ctx.reply('🎬 Fetching video…');
    try {
      const { path, dir, title } = await downloadVideo(url);
      if (statSync(path).size > MAX_BYTES) {
        cleanup(dir);
        await ctx.api.editMessageText(ctx.chat.id, status.message_id, '❌ Video is larger than the size limit. Try a shorter clip.');
        return;
      }
      await ctx.replyWithVideo(new InputFile(path), { caption: `🎬 ${title}` });
      cleanup(dir);
      await ctx.api.deleteMessage(ctx.chat.id, status.message_id).catch(() => {});
    } catch (e) {
      await ctx.api.editMessageText(ctx.chat.id, status.message_id, '❌ ' + (e as Error).message);
    }
  });
}
