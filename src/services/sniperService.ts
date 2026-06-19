/**
 * Launch sniffer ("sniper") — a modern, Trojan-style new-pair radar.
 *
 * It continuously discovers freshly-listed / freshly-active EVM tokens from the
 * free DexScreener feeds, then runs each one through the EXISTING pipeline:
 *   gemService.fetchToken     -> live market data (price, liq, vol, age)
 *   securityService.checkSecurity -> honeypot / contract privileges / holders
 *   analysisService.analyze   -> Safety / Momentum / Narrative scoring + verdict
 *
 * Only launches that clear the configured anti-rug filters are surfaced.
 *
 * NOTE: this is detection + alerting only. It does NOT execute on-chain trades
 * (no wallet / custody in this codebase). NOT financial advice — DYOR.
 */
import { config } from '../config.js';
import { EVM_CHAINS, Pair, fetchToken } from './gemService.js';
import { checkSecurity } from './securityService.js';
import { analyze, Analysis } from './analysisService.js';

export interface NewToken {
  chainId: string;
  tokenAddress: string;
}

export interface SniffResult {
  pair: Pair;
  analysis: Analysis;
  ageMin: number | null;
}

export interface SniperFilters {
  chains: string[] | null; // null = all EVM chains
  minSafety: number;
  minLiquidity: number;
  minVolume: number;
  maxAgeMin: number; // 0 = no age cap
}

const UA = { 'User-Agent': 'Mozilla/5.0', accept: 'application/json' };

async function getJson<T>(url: string, ms = 15000): Promise<T> {
  const res = await fetch(url, { headers: UA, signal: AbortSignal.timeout(ms) });
  if (!res.ok) throw new Error(`DexScreener ${res.status}`);
  return (await res.json()) as T;
}

interface ProfileEntry {
  chainId?: string;
  tokenAddress?: string;
}

/**
 * Discover recently-listed / recently-boosted EVM tokens. We merge the two free
 * "latest" feeds (token profiles + boosts) and de-duplicate by address — this is
 * the freshest funnel DexScreener exposes without an API key. The age filter
 * downstream keeps only genuinely new pairs.
 */
export async function fetchNewTokens(limit = 40): Promise<NewToken[]> {
  const urls = [
    'https://api.dexscreener.com/token-profiles/latest/v1',
    'https://api.dexscreener.com/token-boosts/latest/v1',
  ];
  const lists = await Promise.all(
    urls.map((u) => getJson<ProfileEntry[]>(u).catch(() => [] as ProfileEntry[])),
  );
  const seen = new Set<string>();
  const out: NewToken[] = [];
  for (const entry of lists.flat()) {
    const chainId = entry.chainId;
    const tokenAddress = entry.tokenAddress;
    if (!chainId || !tokenAddress || !EVM_CHAINS.has(chainId)) continue;
    const key = `${chainId}:${tokenAddress.toLowerCase()}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({ chainId, tokenAddress });
    if (out.length >= limit) break;
  }
  return out;
}

function ageMinutes(pair: Pair): number | null {
  if (!pair.pairCreatedAt) return null;
  return (Date.now() - pair.pairCreatedAt) / 60_000;
}

/** Filters seeded from env defaults — used by /fresh and as new-user defaults. */
export function defaultFilters(): SniperFilters {
  return {
    chains: null,
    minSafety: config.sniperMinSafety,
    minLiquidity: config.sniperMinLiquidity,
    minVolume: config.sniperMinVolume,
    maxAgeMin: config.sniperMaxAgeMin,
  };
}

export function passes(pair: Pair, a: Analysis, ageMin: number | null, f: SniperFilters): boolean {
  if (f.chains && !f.chains.includes(pair.chainId)) return false;
  if (a.verdict.startsWith('🛑')) return false; // hard AVOID (honeypot / fails safety)
  if (a.safety < f.minSafety) return false;
  if ((pair.liquidity?.usd ?? 0) < f.minLiquidity) return false;
  if ((pair.volume?.h24 ?? 0) < f.minVolume) return false;
  if (f.maxAgeMin > 0 && ageMin !== null && ageMin > f.maxAgeMin) return false;
  return true;
}

/** Run one candidate token through the full safety + analysis pipeline. */
export async function sniff(token: NewToken): Promise<SniffResult | null> {
  const pair = await fetchToken(token.tokenAddress, token.chainId).catch(() => null);
  if (!pair) return null;
  const sec = await checkSecurity(pair.baseToken.address, pair.chainId);
  const analysis = analyze(pair, sec);
  return { pair, analysis, ageMin: ageMinutes(pair) };
}

function money(n?: number): string {
  if (n === undefined || n === null) return '—';
  if (n >= 1e9) return '$' + (n / 1e9).toFixed(2) + 'B';
  if (n >= 1e6) return '$' + (n / 1e6).toFixed(2) + 'M';
  if (n >= 1e3) return '$' + (n / 1e3).toFixed(2) + 'K';
  return '$' + n.toFixed(2);
}

function ageLabel(ageMin: number | null): string {
  if (ageMin === null) return '—';
  if (ageMin < 60) return `${Math.round(ageMin)}m`;
  if (ageMin < 1440) return `${Math.round(ageMin / 60)}h`;
  return `${Math.round(ageMin / 1440)}d`;
}

/** Modern alert card for a sniffed launch. */
export function formatSnipe(r: SniffResult, header = '🎯 *Fresh launch sniffed!*'): string {
  const { pair: p, analysis: a } = r;
  const flags = a.redFlags.length ? a.redFlags.slice(0, 3).map((f) => `• ${f}`).join('\n') : '✅ No major flags';
  const strengths = a.positives.length ? a.positives.slice(0, 3).join(' · ') : '—';
  return [
    header,
    `💎 *${p.baseToken.symbol}* — ${p.baseToken.name}`,
    `\`${p.chainId}\` · ⏱ ${ageLabel(r.ageMin)} old · $${p.priceUsd ?? '—'}`,
    `🛡 ${a.safety}/100 · 📈 ${a.momentum}/100 · 🧠 ${a.narrative}/100`,
    a.verdict,
    `💧 Liq ${money(p.liquidity?.usd)} · 📊 24h Vol ${money(p.volume?.h24)}`,
    `Strengths: ${strengths}`,
    `Risks:\n${flags}`,
    `\`${p.baseToken.address}\``,
    `🔬 \`/scan ${p.baseToken.address}\` · [Chart](${p.url})`,
    '_Detection only — not financial advice. DYOR._',
  ].join('\n');
}
