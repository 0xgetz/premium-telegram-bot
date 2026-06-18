import { Bot, InlineKeyboard } from 'grammy';
import { db, NoteRow } from '../db/database.js';
import { isPremiumId, LIMITS } from '../services/userService.js';

const insert = db.prepare(`INSERT INTO notes (telegram_id, text, created_at) VALUES (?, ?, ?)`);
const list = db.prepare(
  `SELECT * FROM notes WHERE telegram_id = ? ORDER BY created_at DESC LIMIT 50`,
);
const count = db.prepare(`SELECT COUNT(*) AS n FROM notes WHERE telegram_id = ?`);
const search = db.prepare(
  `SELECT * FROM notes WHERE telegram_id = ? AND text LIKE ? ORDER BY created_at DESC LIMIT 50`,
);
const remove = db.prepare(`DELETE FROM notes WHERE id = ? AND telegram_id = ?`);
const clear = db.prepare(`DELETE FROM notes WHERE telegram_id = ?`);

/** Personal cross-device clipboard / notes. Saved on one device, available everywhere. */
export function registerNotesCommands(bot: Bot): void {
  bot.command('save', (ctx) => {
    const u = ctx.from;
    if (!u) return;
    const text = ctx.match?.toString().trim();
    if (!text) {
      return ctx.reply('Usage: `/save <anything>` — text, links, snippets…', {
        parse_mode: 'Markdown',
      });
    }
    if (!isPremiumId(u.id)) {
      const n = (count.get(u.id) as { n: number }).n;
      if (n >= LIMITS.FREE_MAX_NOTES) {
        return ctx.reply(
          `🚫 Free plan stores ${LIMITS.FREE_MAX_NOTES} notes. Delete some in /notes or go unlimited → /upgrade`,
        );
      }
    }
    insert.run(u.id, text, Date.now());
    return ctx.reply('📌 Saved. View with /notes.');
  });

  bot.command('notes', (ctx) => {
    const u = ctx.from;
    if (!u) return;
    const rows = list.all(u.id) as NoteRow[];
    if (!rows.length)
      return ctx.reply('No notes yet. Save one with `/save <text>`.', { parse_mode: 'Markdown' });
    const kb = new InlineKeyboard();
    const lines = rows.map((r, i) => {
      kb.text(`🗑 ${i + 1}`, `delnote:${r.id}`);
      if ((i + 1) % 5 === 0) kb.row();
      return `*${i + 1}.* ${r.text}`;
    });
    kb.row().text('🧹 Clear all', 'clearnotes');
    return ctx.reply('*Your notes:*\n' + lines.join('\n'), {
      parse_mode: 'Markdown',
      reply_markup: kb,
    });
  });

  // Premium-only full-text search across notes
  bot.command('find', (ctx) => {
    const u = ctx.from;
    if (!u) return;
    if (!isPremiumId(u.id)) {
      return ctx.reply('🔎 *Note search is a premium feature.* Upgrade → /upgrade', {
        parse_mode: 'Markdown',
      });
    }
    const q = ctx.match?.toString().trim();
    if (!q) return ctx.reply('Usage: `/find <keyword>`', { parse_mode: 'Markdown' });
    const rows = search.all(u.id, `%${q}%`) as NoteRow[];
    if (!rows.length) return ctx.reply(`No notes matching "${q}".`);
    return ctx.reply(
      `*Results for "${q}":*\n` + rows.map((r, i) => `*${i + 1}.* ${r.text}`).join('\n'),
      { parse_mode: 'Markdown' },
    );
  });

  bot.callbackQuery(/^delnote:(\d+)$/, async (ctx) => {
    const ok = remove.run(Number(ctx.match[1]), ctx.from.id).changes > 0;
    await ctx.answerCallbackQuery(ok ? 'Deleted' : 'Not found');
  });

  bot.callbackQuery('clearnotes', async (ctx) => {
    clear.run(ctx.from.id);
    await ctx.answerCallbackQuery('All notes cleared');
    await ctx.editMessageText('🧹 All notes cleared.');
  });
}
