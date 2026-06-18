/**
 * EVM token "gems" data via the free DexScreener API (no API key required).
 * Docs: https://docs.dexscreener.com/api/reference
 */

export const EVM_CHAINS = new Set([
  'ethereum', 'bsc', 'polygon', 'arbitrum', 'base', 'optimism', 'avalanche',
  'fantom', 'cronos', 'pulsechain', 'linea', 'scroll', 'zksync', 'mantle',
  'blast', 'celo', 'gnosis', 'metis', 'moonbeam', 'moonriver',
]);

export interface Pair {
  chainId: string;
  dexId: string;
  url: string;
  pairAddress: string;
  baseToken: { name: string; symbol: string; address: string };
  priceUsd?: string;
  priceChange?: { m5?: number; h1?: number; h6?: number; h24?: number };
  liquidity?: { usd?: number };
  volume?: { h24?: number };
  fdv?: number;
  marketCap?: number;
  pairCreatedAt?: number;
  info?: {
    websites?: { url: string }[];
    socials?: { type: string; url: string }[];
  };
  boosts?: { active?: number };
}

/** EVM chain name → numeric chain ID (for honeypot.is / GoPlus). */
export const CHAIN_IDS: Record<string, number> = {
  ethereum: 1, bsc: 56, base: 8453, polygon: 137, arbitrum: 42161, optimism: 10,
  avalanche: 43114, fantom: 250, cronos: 25, pulsechain: 369, linea: 59144,
  scroll: 534352, zksync: 324, mantle: 5000, blast: 81457, celo: 42220,
  gnosis: 100, metis: 1088, moonbeam: 1284, moonriver: 1285,
};

async function getJson<T>(url: string): Promise<T> {
  const res = await fetch(url, { headers: { accept: 'application/json' } });
  if (!res.ok) throw new Error(`DexScreener ${res.status}`);
  return (await res.json()) as T;
}

function bestPair(pairs: Pair[], chain?: string): Pair | null {
  let list = pairs.filter((p) => EVM_CHAINS.has(p.chainId));
  if (chain) list = list.filter((p) => p.chainId === chain.toLowerCase());
  if (!list.length) return null;
  return list.sort((a, b) => (b.liquidity?.usd ?? 0) - (a.liquidity?.usd ?? 0))[0];
}

export async function fetchToken(address: string, chain?: string): Promise<Pair | null> {
  const d = await getJson<{ pairs: Pair[] | null }>(
    `https://api.dexscreener.com/latest/dex/tokens/${address}`,
  );
  return bestPair(d.pairs ?? [], chain);
}

export async function searchTokens(query: string): Promise<Pair[]> {
  const d = await getJson<{ pairs: Pair[] | null }>(
    `https://api.dexscreener.com/latest/dex/search?q=${encodeURIComponent(query)}`,
  );
  return (d.pairs ?? [])
    .filter((p) => EVM_CHAINS.has(p.chainId))
    .sort((a, b) => (b.liquidity?.usd ?? 0) - (a.liquidity?.usd ?? 0))
    .slice(0, 8);
}

export async function trendingGems(limit = 6): Promise<Pair[]> {
  const boosts = await getJson<{ chainId: string; tokenAddress: string }[]>(
    'https://api.dexscreener.com/token-boosts/top/v1',
  );
  const evm = boosts.filter((b) => EVM_CHAINS.has(b.chainId)).slice(0, limit);
  const results = await Promise.all(evm.map((b) => fetchToken(b.tokenAddress, b.chainId).catch(() => null)));
  return results.filter((p): p is Pair => p !== null);
}

// ---------- formatting helpers ----------

function money(n?: number): string {
  if (n === undefined || n === null) return '—';
  if (n >= 1e9) return '$' + (n / 1e9).toFixed(2) + 'B';
  if (n >= 1e6) return '$' + (n / 1e6).toFixed(2) + 'M';
  if (n >= 1e3) return '$' + (n / 1e3).toFixed(2) + 'K';
  return '$' + n.toFixed(2);
}

function pct(n?: number): string {
  if (n === undefined || n === null) return '—';
  const a = n >= 0 ? '🟢 +' : '🔴 ';
  return `${a}${n.toFixed(2)}%`;
}

function age(ts?: number): string {
  if (!ts) return '—';
  const days = Math.floor((Date.now() - ts) / 86_400_000);
  if (days < 1) return `${Math.floor((Date.now() - ts) / 3_600_000)}h`;
  return `${days}d`;
}

export function formatPair(p: Pair): string {
  const liq = p.liquidity?.usd ?? 0;
  const warn: string[] = [];
  if (liq < 10_000) warn.push('⚠️ very low liquidity (rug risk)');
  if ((p.volume?.h24 ?? 0) < 1_000) warn.push('⚠️ thin 24h volume');
  if (age(p.pairCreatedAt).endsWith('h')) warn.push('🆕 brand-new pair — high risk');

  return [
    `💎 *${p.baseToken.symbol}* — ${p.baseToken.name}`,
    `Chain: \`${p.chainId}\` · DEX: ${p.dexId}`,
    `Price: *$${p.priceUsd ?? '—'}*`,
    `5m ${pct(p.priceChange?.m5)} · 1h ${pct(p.priceChange?.h1)} · 24h ${pct(p.priceChange?.h24)}`,
    `Liquidity: ${money(liq)} · 24h Vol: ${money(p.volume?.h24)}`,
    `FDV: ${money(p.fdv)} · MCap: ${money(p.marketCap)} · Age: ${age(p.pairCreatedAt)}`,
    `\`${p.baseToken.address}\``,
    warn.length ? '\n' + warn.join('\n') : '',
    `\n[Chart on DexScreener](${p.url})`,
  ].join('\n');
}

export function shortLine(p: Pair): string {
  return `💎 *${p.baseToken.symbol}* (${p.chainId}) — $${p.priceUsd ?? '—'} · 24h ${pct(p.priceChange?.h24)} · liq ${money(p.liquidity?.usd)}`;
}
