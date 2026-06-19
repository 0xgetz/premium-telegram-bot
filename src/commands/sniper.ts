import { Bot, InlineKeyboard } from 'grammy';
import { config } from '../config.js';
import { db } from '../db/database.js';
import { isPremiumId } from '../services/userService.js';
import { EVM_CHAINS } from '../services/gemService.js';
import {
  fetchNewTokens,
  sniff,
  passes,
  formatSnipe,
  defaultFilters,
  SniperFilters,
  SniffResult,
} from '../services/sniperService.js';

const md = { parse_mode: 'Markdown' as const, link_preview_options: { is_disabled: true } };

interface SniperCfgRow {
  telegram_id: number;
  chat_id: number;
  enabled: number;
  chains: string | null;
  min_safety: number;
  min_liquidity: number;
  min_volume: number;
  max_age_min: number;
  created_at: number;
  updated_at: number;
}

const getCfg = db.prepare(`SELECT * FROM sniper_config WHERE telegram_id = ?`);
const insertCfg = db.prepare(
  `INSERT INTO sniper_config
     (telegram_id, chat_id, enabled, chains, min_safety, min_liquidity, min_volume, max_age_min, created_at, updated_at)
   VALUES (?, ?, 0, NULL, ?, ?, ?, ?, ?, ?)
   ON CONFLICT(telegram_id) DO UPDATE SET chat_id = excluded.chat_id, updated_at = excluded.updated_at`,
);
const setEnabled = db.prepare(`UPDATE sniper_config SET enabled = ?, updated_at = ? WHERE telegram_id = ?`);
const setChains = db.prepare(`UPDATE sniper_config SET chains = ?, updated_at = ? WHERE telegram_id = ?`);
const setSafety = db.prepare(`UPDATE sniper_config SET min_safety = ?, updated_at = ? WHERE telegram_id = ?`);
const setLiq = db.prepare(`UPDATE sniper_config SET min_liquidity = ?, updated_at = ? WHERE telegram_id = ?`);
const setVol = db.prepare(`UPDATE sniper_config SET min_volume = ?, updated_at = ? WHERE telegram_id = ?`);
const setAge = db.prepare(`UPDATE sniper_config SET max_age_min = ?, updated_at = ? WHERE telegram_id = ?`);
const listEnabled = db.prepare(`SELECT * FROM sniper_config WHERE enabled = 1`);

const seenExists = db.prepare(
  `SELECT 1 FROM sniper_seen WHERE telegram_id = ? AND lower(address) = lower(?)`,
);
const markSeen = db.prepare(
  `INSERT OR IGNORE INTO sniper_seen (telegram_id, address, created_at) VALUES (?, ?, ?)`,
);
const pruneSeen = db.prepare(`DELETE FROM sniper_seen WHERE created_at < ?`);

function ensureCfg(telegramId: number, chatId: number): SniperCfgRow {
  const d = defaultFilters();
  const now = Date.now();
  insertCfg.run(telegramId, chatId, d.minSafety, d.minLiquidity, d.minVolume, d.maxAgeMin, now, now);
  return getCfg.get(telegramId) as SniperCfgRow;
}

function filtersFromRow(row: SniperCfgRow): SniperFilters {
  return {
    chains: row.chains ? row.chains.split(',').map((c) => c.trim()).filter(Boolean) : null,
    minSafety: row.min_safety,
    minLiquidity: row.min_liquidity,
    minVolume: row.min_volume,
    maxAgeMin: row.max_age_min,
  };
}

function money(n: number): string {
  if (n >= 1e6) return '$' + (n / 1e6).toFixed(1) + 'M';
  if (n >= 1e3) return '$' + (n / 1e3).toFixed(0) + 'K';
  return '$' + n;
}

function formatConfig(row: SniperCfgRow): string {
  return [
    `🎯 *Launch Sniper* — ${row.enabled ? '🟢 ON' : '🔴 OFF'}`,
    `🛡 Min Safety: *${row.min_safety}/100*`,
    `💧 Min Liquidity: *${money(row.min_liquidity)}*`,
    `📊 Min 24h Volume: *${money(row.min_volume)}*`,
    `⏱ Max age: *${row.max_age_min}m*`,
    `⛓ Chains: *${row.chains ?? 'all EVM'}*`,
  ].join('\n');
}

const USAGE =
  '\n\n*Tune it:*\n' +
  '`/snipe on` · `/snipe off`\n' +
  '`/snipe set safety 70`\n' +
  '`/snipe set liq 20000`\n' +
  '`/snipe set vol 5000`\n' +
  '`/snipe set age 120`\n' +
  '`/snipe set chains base,ethereum`  (or `all`)\n\n' +
  '_The radar checks brand-new launches and alerts you only when one clears your filters._';

function toggleKb(enabled: boolean): InlineKeyboard {
  return new InlineKeyboard()
    .text(enabled ? '🔴 Turn OFF' : '🟢 Turn ON', enabled ? 'snipe:off' : 'snipe:on');
}

export function registerSniperCommands(bot: Bot): void {
  // /fresh — manual one-off scan of the newest launches (free taster)
  bot.command('fresh', async (ctx) => {
    const loading = await ctx.reply('🎯 Sniffing the newest launches…');
    try {
      const tokens = (await fetchNewTokens(40)).slice(0, 16);
      if (!tokens.length) {
        return ctx.api.editMessageText(ctx.chat.id, loading.message_id, 'No fresh launches found right now, try later.');
      }
      const results = (await Promise.all(tokens.map((t) => sniff(t).catch(() => null)))).filter(
        (r): r is SniffResult => r !== null,
      );
      const f = defaultFilters();
      const hits = results
        .filter((r) => passes(r.pair, r.analysis, r.ageMin, f))
        .sort((a, b) => (a.ageMin ?? 1e9) - (b.ageMin ?? 1e9))
        .slice(0, 5);
      if (!hits.length) {
        return ctx.api.editMessageText(
          ctx.chat.id, loading.message_id,
          `🎯 Scanned ${results.length} fresh tokens — none cleared the default safety filter ` +
            `(Safety ≥ ${f.minSafety}, liq ≥ ${money(f.minLiquidity)}, vol ≥ ${money(f.minVolume)}).\n` +
            'Markets are risky; try `/snipe` for an always-on custom radar (premium).',
          md,
        );
      }
      const body = hits.map((r) => formatSnipe(r, '💎')).join('\n\n');
      await ctx.api.editMessageText(
        ctx.chat.id, loading.message_id,
        `🎯 *Fresh launches that passed safety*\n_${hits.length}/${results.length} scanned · always-on radar → /snipe_\n\n${body}`,
        md,
      );
    } catch (e) {
      await ctx.api.editMessageText(ctx.chat.id, loading.message_id, '❌ ' + (e as Error).message);
    }
  });

  // /snipe — configure the always-on launch radar (premium)
  bot.command('snipe', async (ctx) => {
    const u = ctx.from;
    if (!u) return;
    if (!isPremiumId(u.id)) {
      return ctx.reply(
        '✨ The always-on launch *sniper* is premium → /upgrade\nTry `/fresh` for a manual scan anytime.',
        md,
      );
    }
    const cfg = ensureCfg(u.id, ctx.chat.id);
    const args = (ctx.match?.toString() ?? '').trim().split(/\s+/).filter(Boolean);

    if (!args.length) {
      return ctx.reply(formatConfig(cfg) + USAGE, { ...md, reply_markup: toggleKb(!!cfg.enabled) });
    }

    const cmd = args[0].toLowerCase();
    const now = Date.now();

    if (cmd === 'on') {
      setEnabled.run(1, now, u.id);
      return ctx.reply('🎯 Sniper *ON*. I\'ll alert you the moment a fresh launch clears your filters.', md);
    }
    if (cmd === 'off') {
      setEnabled.run(0, now, u.id);
      return ctx.reply('🔴 Sniper *OFF*.', md);
    }

    if (cmd === 'set') {
      const key = (args[1] ?? '').toLowerCase();
      const val = args[2];
      if (!key || val === undefined) return ctx.reply('Usage: `/snipe set <safety|liq|vol|age|chains> <value>`', md);

      if (key === 'chains') {
        if (val.toLowerCase() === 'all') {
          setChains.run(null, now, u.id);
          return ctx.reply('⛓ Chains set to *all EVM*.', md);
        }
        const chains = args.slice(2).join(' ').split(',').map((c) => c.trim().toLowerCase()).filter(Boolean);
        const bad = chains.filter((c) => !EVM_CHAINS.has(c));
        if (bad.length) return ctx.reply(`❌ Unknown chain(s): ${bad.join(', ')}\nSupported: ${[...EVM_CHAINS].slice(0, 12).join(', ')}…`, md);
        setChains.run(chains.join(','), now, u.id);
        return ctx.reply(`⛓ Chains set to *${chains.join(', ')}*.`, md);
      }

      const n = Number(val);
      if (!Number.isFinite(n) || n < 0) return ctx.reply('❌ Value must be a non-negative number.', md);
      switch (key) {
        case 'safety':
          setSafety.run(Math.min(100, Math.round(n)), now, u.id);
          return ctx.reply(`🛡 Min Safety set to *${Math.min(100, Math.round(n))}/100*.`, md);
        case 'liq':
          setLiq.run(n, now, u.id);
          return ctx.reply(`💧 Min liquidity set to *${money(n)}*.`, md);
        case 'vol':
          setVol.run(n, now, u.id);
          return ctx.reply(`📊 Min 24h volume set to *${money(n)}*.`, md);
        case 'age':
          setAge.run(Math.round(n), now, u.id);
          return ctx.reply(`⏱ Max age set to *${Math.round(n)}m*.`, md);
        default:
          return ctx.reply('❌ Unknown setting. Use safety, liq, vol, age, or chains.', md);
      }
    }

    return ctx.reply(formatConfig(cfg) + USAGE, { ...md, reply_markup: toggleKb(!!cfg.enabled) });
  });

  bot.callbackQuery(/^snipe:(on|off)$/, async (ctx) => {
    if (!isPremiumId(ctx.from.id)) {
      return ctx.answerCallbackQuery({ text: 'Premium only → /upgrade', show_alert: true });
    }
    ensureCfg(ctx.from.id, ctx.chat?.id ?? ctx.from.id);
    const on = ctx.match[1] === 'on';
    setEnabled.run(on ? 1 : 0, Date.now(), ctx.from.id);
    await ctx.answerCallbackQuery(on ? '🎯 Sniper ON' : '🔴 Sniper OFF');
    const cfg = getCfg.get(ctx.from.id) as SniperCfgRow;
    await ctx.editMessageText(formatConfig(cfg) + USAGE, { ...md, reply_markup: toggleKb(on) });
  });
}

/**
 * Background loop: poll fresh launches, evaluate them against each premium
 * user's filters, and alert on the first match (de-duplicated per user).
 */
export function startSniperScheduler(bot: Bot, intervalMs = config.sniperPollSeconds * 1000): void {
  const tick = async () => {
    const cfgs = listEnabled.all() as SniperCfgRow[];
    if (!cfgs.length) return;

    let tokens;
    try {
      tokens = await fetchNewTokens(40);
    } catch {
      return;
    }
    if (!tokens.length) return;

    // Sniff each candidate once, reuse the result for every subscriber.
    const results: SniffResult[] = [];
    for (const t of tokens) {
      const r = await sniff(t).catch(() => null);
      if (r) results.push(r);
    }

    for (const cfg of cfgs) {
      if (!isPremiumId(cfg.telegram_id)) continue;
      const f = filtersFromRow(cfg);
      for (const r of results) {
        try {
          const addr = r.pair.baseToken.address;
          if (!passes(r.pair, r.analysis, r.ageMin, f)) continue;
          if (seenExists.get(cfg.telegram_id, addr)) continue;
          markSeen.run(cfg.telegram_id, addr, Date.now());
          await bot.api.sendMessage(cfg.chat_id, formatSnipe(r), {
            parse_mode: 'Markdown',
            link_preview_options: { is_disabled: true },
          });
        } catch {
          /* skip this token on error */
        }
      }
    }

    pruneSeen.run(Date.now() - 7 * 86_400_000);
  };
  setInterval(() => void tick(), intervalMs);
}
