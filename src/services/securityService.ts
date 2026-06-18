/**
 * Token security / honeypot detection.
 * Primary source: honeypot.is (free, no key) — simulates a real buy & sell.
 * Enrichment: GoPlus Security (free, no key) — contract privileges & holders.
 * Both calls are best-effort; the report degrades gracefully if one fails.
 */
import { CHAIN_IDS } from './gemService.js';

const UA = { 'User-Agent': 'Mozilla/5.0', accept: 'application/json' };

export interface SecurityReport {
  sources: string[];
  isHoneypot: boolean | null;
  honeypotReason?: string;
  simulationOk: boolean | null;
  buyTax: number | null;
  sellTax: number | null;
  openSource: boolean | null;
  isProxy: boolean | null;
  isMintable: boolean | null;
  canTakeBackOwnership: boolean | null;
  hiddenOwner: boolean | null;
  ownerChangeBalance: boolean | null;
  transferPausable: boolean | null;
  cannotSellAll: boolean | null;
  blacklistable: boolean | null;
  slippageModifiable: boolean | null;
  topHolderPct: number | null;
  holders: number | null;
  riskLabel: string | null;
}

async function getJson<T>(url: string, ms = 15000): Promise<T> {
  const res = await fetch(url, { headers: UA, signal: AbortSignal.timeout(ms) });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return (await res.json()) as T;
}

const flag = (v: unknown): boolean | null =>
  v === '1' || v === 1 || v === true ? true : v === '0' || v === 0 || v === false ? false : null;
const num = (v: unknown): number | null => {
  const n = parseFloat(String(v));
  return isNaN(n) ? null : n;
};

function empty(): SecurityReport {
  return {
    sources: [], isHoneypot: null, simulationOk: null, buyTax: null, sellTax: null,
    openSource: null, isProxy: null, isMintable: null, canTakeBackOwnership: null,
    hiddenOwner: null, ownerChangeBalance: null, transferPausable: null,
    cannotSellAll: null, blacklistable: null, slippageModifiable: null,
    topHolderPct: null, holders: null, riskLabel: null,
  };
}

async function fromHoneypot(address: string, chainId: number, r: SecurityReport): Promise<void> {
  try {
    const d = await getJson<any>(
      `https://api.honeypot.is/v2/IsHoneypot?address=${address}&chainID=${chainId}`,
    );
    r.sources.push('honeypot.is');
    if (d.honeypotResult) r.isHoneypot = !!d.honeypotResult.isHoneypot;
    if (d.honeypotResult?.honeypotReason) r.honeypotReason = d.honeypotResult.honeypotReason;
    if (typeof d.simulationSuccess === 'boolean') r.simulationOk = d.simulationSuccess;
    if (d.simulationResult) {
      r.buyTax = num(d.simulationResult.buyTax);
      r.sellTax = num(d.simulationResult.sellTax);
    }
    if (d.contractCode) {
      r.openSource = !!d.contractCode.openSource;
      r.isProxy = !!d.contractCode.isProxy;
    }
    if (d.token?.totalHolders) r.holders = d.token.totalHolders;
    if (d.summary?.risk) r.riskLabel = d.summary.risk;
  } catch {
    /* honeypot.is unavailable for this chain/token */
  }
}

async function fromGoPlus(address: string, chainId: number, r: SecurityReport): Promise<void> {
  try {
    const d = await getJson<any>(
      `https://api.goplus.io/api/v1/token_security/${chainId}?contract_addresses=${address}`,
    );
    const t = d?.result?.[address.toLowerCase()];
    if (!t) return;
    r.sources.push('GoPlus');
    if (r.isHoneypot === null) r.isHoneypot = flag(t.is_honeypot);
    if (r.buyTax === null) r.buyTax = num(t.buy_tax) !== null ? num(t.buy_tax)! * 100 : null;
    if (r.sellTax === null) r.sellTax = num(t.sell_tax) !== null ? num(t.sell_tax)! * 100 : null;
    if (r.openSource === null) r.openSource = flag(t.is_open_source);
    if (r.isProxy === null) r.isProxy = flag(t.is_proxy);
    r.isMintable = flag(t.is_mintable);
    r.canTakeBackOwnership = flag(t.can_take_back_ownership);
    r.hiddenOwner = flag(t.hidden_owner);
    r.ownerChangeBalance = flag(t.owner_change_balance);
    r.transferPausable = flag(t.transfer_pausable);
    r.cannotSellAll = flag(t.cannot_sell_all);
    r.blacklistable = flag(t.is_blacklisted);
    r.slippageModifiable = flag(t.slippage_modifiable);
    if (t.holder_count) r.holders = parseInt(t.holder_count, 10);
    if (Array.isArray(t.holders) && t.holders[0]?.percent) {
      r.topHolderPct = parseFloat(t.holders[0].percent) * 100;
    }
  } catch {
    /* GoPlus unavailable */
  }
}

export async function checkSecurity(address: string, chain: string): Promise<SecurityReport> {
  const chainId = CHAIN_IDS[chain.toLowerCase()] ?? 1;
  const r = empty();
  await Promise.all([fromHoneypot(address, chainId, r), fromGoPlus(address, chainId, r)]);
  return r;
}
