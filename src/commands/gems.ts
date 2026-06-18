import { Bot, InlineKeyboard } from 'grammy';
import { config } from '../config.js';
import { db } from '../db/database.js';
import { isPremiumId } from '../services/userService.js';
import {
  fetchToken,
  searchTokens,
  trendingGems,
  formatPair,
  shortLine,
  EVM_CHAINS,
  Pair,
} from '../services/gemService.js';
import { checkSecurity } from '../services/securityService.js';
import { analyze, formatAnalysis } from '../services/analysisService.js';

const md = { parse_mode: 'Markdown' as const, link_preview_options: { is_disabled: true } };
const FREE_MAX_WATCH = 3;

const addWatch = db.prepare(
  `INSERT INTO watchlist (telegram_id, chat_id, chain, address, symbol, ref_price, created_at)
   VALUES (?, ?, ?, ?, ?, ?, ?)`,
);
const listWatch = db.prepare(`SELECT * FROM watchlist WHERE telegram_id = ? ORDER BY created_at`);
const countWatch = db.prepare(`SELECT COUNT(*) AS n FROM watchlist WHERE telegram_id = ?`);
const existsWatch = db.prepare(
  `SELECT id FROM watchlist WHERE telegram_id = ? AND lower(address) = lower(?)`,
);
const delWatch = db.prepare(`DELETE FROM watchlist WHERE id = ? AND telegram_id = ?`);
const allWatch = db.prepare(`SELECT * FROM watchlist`);
const setRef = db.prepare(`UPDATE watchlist SET ref_price = ? WHERE id = ?`);

interface WatchRow {
  id: number; telegram_id: number; chat_id: number; chain: string;
  address: string; symbol: string | null; ref_price: number;
}

const isEvmAddress = (s: string) => /^0x[a-fA-F0-9]{40}$/.test(s);

export function registerGemCommands(bot: Bot): void {
  // /gem <address> [chain]  OR  /gem <symbol/name>
  bot.command('gem', async (ctx) => {
    const parts = ctx.match?.toString().trim().split(/\s+/) ?? [];
    const q = parts[0];
    if (!q) {
      return ctx.reply(
        '💎 Usage:\n`/gem 0x<token address> [chain]`\n`/gem PEPE` (search)\n\nChains: ' +
          [...EVM_CHAINS].slice(0, 10).join(', ') + '…',
        md,
      );
    }
    const loading = await ctx.reply('🔎 Looking up token…');
    try {
      let pair: Pair | null = null;
      if (isEvmAddress(q)) {
        pair = await fetchToken(q, parts[1]);
      } else {
        const found = await searchTokens(parts.join(' '));
        pair = found[0] ?? null;
      }
      if (!pair) {
        return ctx.api.editMessageText(ctx.chat.id, loading.message_id, '❌ No EVM token found for that query.');
      }
      await ctx.api.editMessageText(ctx.chat.id, loading.message_id, formatPair(pair) + '\n\n🔬 Run `/scan ' + pair.baseToken.address + '` for safety + buy/hold analysis.', md);
    } catch (e) {
      await ctx.api.editMessageText(ctx.chat.id, loading.message_id, '❌ ' + (e as Error).message);
    }
  });

  // /scan <address> [chain] — full safety + buy/hold analysis
  bot.command('scan', async (ctx) => {
    const u = ctx.from;
    if (!u) return;
    const parts = ctx.match?.toString().trim().split(/\s+/) ?? [];
    const addr = parts[0];
    if (!addr || !isEvmAddress(addr)) {
      return ctx.reply('🔬 Usage: `/scan 0x<token address> [chain]`\nSafety + buy/hold analysis.', md);
    }
    const loading = await ctx.reply('🔬 Scanning contract, market & narrative…');
    try {
      const pair = await fetchToken(addr, parts[1]);
      if (!pair) {
        return ctx.api.editMessageText(ctx.chat.id, loading.message_id, '❌ Token not found on supported EVM DEXes.');
      }
      const sec = await checkSecurity(pair.baseToken.address, pair.chainId);
      const analysis = analyze(pair, sec);
      const header =
        `💎 *${pair.baseToken.symbol}* — ${pair.baseToken.name}\n` +
        `\`${pair.chainId}\` · $${pair.priceUsd ?? '—'} · liq ${(((pair.liquidity?.usd ?? 0)) / 1000).toFixed(0)}k\n` +
        `Checks: ${sec.sources.join(' + ') || 'limited'}\n\n`;
      await ctx.api.editMessageText(ctx.chat.id, loading.message_id, header + formatAnalysis(analysis), {
        ...md,
      });
    } catch (e) {
      await ctx.api.editMessageText(ctx.chat.id, loading.message_id, '❌ ' + (e as Error).message);
    }
  });

  // /honeypot <address> [chain] — quick can-I-sell check
  bot.command('honeypot', async (ctx) => {
    const parts = ctx.match?.toString().trim().split(/\s+/) ?? [];
    const addr = parts[0];
    if (!addr || !isEvmAddress(addr)) return ctx.reply('🍯 Usage: `/honeypot 0x<address> [chain]`', md);
    const loading = await ctx.reply('🍯 Simulating buy & sell…');
    try {
      const pair = await fetchToken(addr, parts[1]);
      const chain = pair?.chainId ?? parts[1] ?? 'ethereum';
      const sec = await checkSecurity(addr, chain);
      if (sec.isHoneypot === null && sec.sources.length === 0) {
        return ctx.api.editMessageText(ctx.chat.id, loading.message_id, '⚠️ Could not verify on this chain. Be careful.');
      }
      const verdict = sec.isHoneypot === true
        ? '🚨 *HONEYPOT* — you likely CANNOT sell!'
        : sec.isHoneypot === false
          ? '✅ *Not a honeypot* (sellable in simulation)'
          : '⚠️ Inconclusive';
      const lines = [
        verdict,
        sec.honeypotReason ? `Reason: ${sec.honeypotReason}` : '',
        `Buy tax: ${sec.buyTax ?? '—'}% · Sell tax: ${sec.sellTax ?? '—'}%`,
        `Verified: ${sec.openSource === null ? '—' : sec.openSource ? 'yes' : 'NO ⚠️'} · Proxy: ${sec.isProxy ? 'yes ⚠️' : 'no'}`,
        sec.topHolderPct !== null ? `Top holder: ${sec.topHolderPct.toFixed(0)}%` : '',
        `Source: ${sec.sources.join(' + ') || 'n/a'}`,
        '\n_Not financial advice. DYOR._',
      ].filter(Boolean);
      await ctx.api.editMessageText(ctx.chat.id, loading.message_id, lines.join('\n'), md);
    } catch (e) {
      await ctx.api.editMessageText(ctx.chat.id, loading.message_id, '❌ ' + (e as Error).message);
    }
  });

  // /findtoken <symbol/name>
  bot.command('findtoken', async (ctx) => {
    const q = ctx.match?.toString().trim();
    if (!q) return ctx.reply('Usage: `/findtoken pepe`', md);
    const loading = await ctx.reply('🔎 Searching…');
    try {
      const found = await searchTokens(q);
      if (!found.length) return ctx.api.editMessageText(ctx.chat.id, loading.message_id, '❌ Nothing found.');
      const text = found.map((p, i) => `${i + 1}. ${shortLine(p)}\n\`${p.baseToken.address}\``).join('\n\n');
      await ctx.api.editMessageText(ctx.chat.id, loading.message_id, '*Matches:*\n' + text, md);
    } catch (e) {
      await ctx.api.editMessageText(ctx.chat.id, loading.message_id, '❌ ' + (e as Error).message);
    }
  });

  // /gems — trending EVM gems
  bot.command('gems', async (ctx) => {
    const loading = await ctx.reply('💎 Loading trending gems…');
    try {
      const gems = await trendingGems(6);
      if (!gems.length) return ctx.api.editMessageText(ctx.chat.id, loading.message_id, 'No gems right now, try later.');
      const text = gems.map((p) => `${shortLine(p)}\n\`${p.baseToken.address}\``).join('\n\n');
      await ctx.api.editMessageText(
        ctx.chat.id, loading.message_id,
        '🔥 *Trending EVM gems* (boosted on DexScreener)\n_Always DYOR — these are not endorsements._\n\n' + text,
        md,
      );
    } catch (e) {
      await ctx.api.editMessageText(ctx.chat.id, loading.message_id, '❌ ' + (e as Error).message);
    }
  });

  // /watch <address> [chain] — premium price alerts
  bot.command('watch', async (ctx) => {
    const u = ctx.from;
    if (!u) return;
    if (!isPremiumId(u.id)) {
      return ctx.reply(`✨ *Gem price alerts* are premium. Get notified on ±${config.gemAlertPercent}% moves → /upgrade`, md);
    }
    const parts = ctx.match?.toString().trim().split(/\s+/) ?? [];
    const addr = parts[0];
    if (!addr || !isEvmAddress(addr)) return ctx.reply('Usage: `/watch 0x<address> [chain]`', md);
    if ((countWatch.get(u.id) as { n: number }).n >= 50) return ctx.reply('Watchlist limit reached (50).');
    if (existsWatch.get(u.id, addr)) return ctx.reply('Already watching that token.');

    const pair = await fetchToken(addr, parts[1]);
    if (!pair) return ctx.reply('❌ Token not found.');
    addWatch.run(u.id, ctx.chat.id, pair.chainId, pair.baseToken.address, pair.baseToken.symbol, Number(pair.priceUsd ?? 0), Date.now());
    return ctx.reply(`👀 Watching *${pair.baseToken.symbol}*. I'll alert you on ±${config.gemAlertPercent}% moves.`, md);
  });

  // /watchlist — show watched tokens (premium)
  bot.command('watchlist', async (ctx) => {
    const u = ctx.from;
    if (!u) return;
    if (!isPremiumId(u.id)) return ctx.reply('✨ Watchlists are premium → /upgrade', md);
    const rows = listWatch.all(u.id) as WatchRow[];
    if (!rows.length) return ctx.reply('Empty. Add with `/watch 0x<address>`.', md);
    const kb = new InlineKeyboard();
    const lines: string[] = [];
    for (let i = 0; i < rows.length; i++) {
      const p = await fetchToken(rows[i].address, rows[i].chain).catch(() => null);
      lines.push(p ? `${i + 1}. ${shortLine(p)}` : `${i + 1}. ${rows[i].symbol ?? rows[i].address} (no data)`);
      kb.text(`🗑 ${i + 1}`, `unwatch:${rows[i].id}`);
      if ((i + 1) % 4 === 0) kb.row();
    }
    return ctx.reply('*Your watchlist:*\n' + lines.join('\n'), { ...md, reply_markup: kb });
  });

  bot.callbackQuery(/^unwatch:(\d+)$/, async (ctx) => {
    const ok = delWatch.run(Number(ctx.match[1]), ctx.from.id).changes > 0;
    await ctx.answerCallbackQuery(ok ? 'Removed' : 'Not found');
    if (ok) await ctx.editMessageReplyMarkup();
  });
}

/** Background loop: alert watchers when a token moves beyond the threshold. */
export function startGemAlertScheduler(bot: Bot, intervalMs = 5 * 60 * 1000): void {
  const tick = async () => {
    const rows = allWatch.all() as WatchRow[];
    for (const w of rows) {
      try {
        const p = await fetchToken(w.address, w.chain);
        const price = Number(p?.priceUsd ?? 0);
        if (!price || !w.ref_price) continue;
        const change = ((price - w.ref_price) / w.ref_price) * 100;
        if (Math.abs(change) >= config.gemAlertPercent) {
          const arrow = change >= 0 ? '🟢📈' : '🔴📉';
          await bot.api.sendMessage(
            w.chat_id,
            `${arrow} *${w.symbol ?? 'token'}* moved *${change.toFixed(1)}%*\nNow $${p?.priceUsd}`,
            { parse_mode: 'Markdown' },
          );
          setRef.run(price, w.id);
        }
      } catch {
        /* skip this token on error */
      }
    }
  };
  setInterval(() => void tick(), intervalMs);
}
