/**
 * Combines DexScreener market data + security report into an educational
 * assessment: a Safety score, a Momentum score, a Narrative score, an overall
 * verdict, and a suggested holding horizon (scalp hours vs swing days).
 *
 * THIS IS NOT FINANCIAL ADVICE. It is a heuristic summary of public data to
 * help users do their own research. Crypto micro-caps are extremely risky.
 */
import { Pair } from './gemService.js';
import { SecurityReport } from './securityService.js';

export interface Analysis {
  safety: number;
  momentum: number;
  narrative: number;
  verdict: string;
  horizon: string;
  positives: string[];
  redFlags: string[];
}

const clamp = (n: number) => Math.max(0, Math.min(100, Math.round(n)));

function socials(pair: Pair) {
  const sites = pair.info?.websites?.length ?? 0;
  const types = new Set((pair.info?.socials ?? []).map((s) => s.type?.toLowerCase()));
  return {
    site: sites > 0,
    twitter: types.has('twitter') || types.has('x'),
    telegram: types.has('telegram'),
    count: sites + types.size,
  };
}

function ageHours(pair: Pair): number | null {
  if (!pair.pairCreatedAt) return null;
  return (Date.now() - pair.pairCreatedAt) / 3_600_000;
}

export function analyze(pair: Pair, sec: SecurityReport): Analysis {
  const positives: string[] = [];
  const redFlags: string[] = [];

  // ---------- SAFETY ----------
  let safety = 100;
  if (sec.isHoneypot === true) {
    safety = 0;
    redFlags.push('🚨 HONEYPOT — you likely CANNOT sell this token');
  }
  if (sec.simulationOk === false && sec.isHoneypot !== false) {
    safety -= 25;
    redFlags.push('⚠️ Sell simulation failed — selling may be blocked');
  }
  if ((sec.sellTax ?? 0) > 20) { safety -= 40; redFlags.push(`⚠️ Very high sell tax: ${sec.sellTax}%`); }
  else if ((sec.sellTax ?? 0) > 10) { safety -= 20; redFlags.push(`⚠️ High sell tax: ${sec.sellTax}%`); }
  else if (sec.sellTax !== null) { positives.push(`Sell tax ${sec.sellTax}%`); }
  if ((sec.buyTax ?? 0) > 10) { safety -= 10; redFlags.push(`High buy tax: ${sec.buyTax}%`); }
  if (sec.openSource === false) { safety -= 30; redFlags.push('⚠️ Contract NOT verified / open source'); }
  else if (sec.openSource === true) { positives.push('Contract verified'); }
  if (sec.isProxy === true) { safety -= 10; redFlags.push('Proxy contract — logic can change'); }
  if (sec.isMintable === true) { safety -= 15; redFlags.push('Mintable — supply can be inflated'); }
  if (sec.canTakeBackOwnership === true) { safety -= 25; redFlags.push('Owner can reclaim ownership'); }
  if (sec.hiddenOwner === true) { safety -= 25; redFlags.push('Hidden owner detected'); }
  if (sec.ownerChangeBalance === true) { safety -= 30; redFlags.push('Owner can change balances'); }
  if (sec.transferPausable === true) { safety -= 15; redFlags.push('Transfers can be paused'); }
  if (sec.cannotSellAll === true) { safety -= 20; redFlags.push('Cannot sell 100% in one go'); }
  if (sec.blacklistable === true) { safety -= 10; redFlags.push('Blacklist function present'); }
  if (sec.slippageModifiable === true) { safety -= 10; redFlags.push('Tax/slippage can be changed'); }
  if ((sec.topHolderPct ?? 0) > 50) { safety -= 20; redFlags.push(`Top holder owns ${sec.topHolderPct?.toFixed(0)}%`); }
  else if ((sec.topHolderPct ?? 0) > 30) { safety -= 10; redFlags.push(`Top holder owns ${sec.topHolderPct?.toFixed(0)}%`); }

  const liq = pair.liquidity?.usd ?? 0;
  if (liq < 10_000) { safety -= 20; redFlags.push('Very low liquidity (<$10k)'); }
  else if (liq < 50_000) { safety -= 8; }
  else { positives.push(`Liquidity ${(liq / 1000).toFixed(0)}k`); }
  safety = clamp(safety);

  // ---------- MOMENTUM ----------
  const c = pair.priceChange ?? {};
  let momentum = 50 + (c.h24 ?? 0) * 0.4 + (c.h6 ?? 0) * 0.3 + (c.h1 ?? 0) * 0.6;
  const vol = pair.volume?.h24 ?? 0;
  const volRatio = liq > 0 ? vol / liq : 0;
  if (volRatio > 1) { momentum += 15; positives.push('Strong volume vs liquidity'); }
  else if (volRatio > 0.3) { momentum += 7; }
  else if (vol < 1000) { momentum -= 10; redFlags.push('Thin 24h volume'); }
  if ((c.h24 ?? 0) > 30) positives.push(`Up ${c.h24?.toFixed(0)}% (24h)`);
  if ((c.h24 ?? 0) < -30) redFlags.push(`Down ${Math.abs(c.h24!).toFixed(0)}% (24h)`);
  momentum = clamp(momentum);

  // ---------- NARRATIVE ----------
  const s = socials(pair);
  let narrative = 0;
  if (s.site) { narrative += 15; positives.push('Has website'); }
  if (s.twitter) { narrative += 15; positives.push('Active on X/Twitter'); }
  if (s.telegram) { narrative += 10; positives.push('Has Telegram'); }
  if ((pair.boosts?.active ?? 0) > 0) { narrative += 20; positives.push('Boosted/promoted (hype)'); }
  if (volRatio > 1) narrative += 15;
  if ((sec.holders ?? 0) > 5000) { narrative += 20; positives.push(`${sec.holders} holders`); }
  else if ((sec.holders ?? 0) > 1000) { narrative += 10; }
  const h = ageHours(pair);
  if (h !== null && h < 24) narrative += 5; // fresh launch = active narrative window
  narrative = clamp(narrative);

  // ---------- VERDICT & HORIZON ----------
  let verdict: string;
  let horizon: string;
  if (sec.isHoneypot === true || safety < 30) {
    verdict = '🛑 AVOID — fails basic safety checks';
    horizon = 'Do not buy.';
  } else if (safety < 55) {
    verdict = '⚠️ HIGH RISK — only with money you can lose';
    horizon = h !== null && h < 24 ? 'Scalp only (minutes–hours), tight stop.' : 'Speculative, very short-term at most.';
  } else {
    const opp = Math.round((momentum + narrative) / 2);
    if (opp >= 65 && momentum >= 60) {
      verdict = '🟢 Looks interesting — momentum + narrative aligned';
      horizon = h !== null && h < 48
        ? 'Swing candidate (hours–few days) while momentum holds.'
        : 'Could suit a multi-day swing if trend continues.';
    } else if (opp >= 50) {
      verdict = '🟡 Mixed — watch before committing';
      horizon = 'Short-term watch (hours). Wait for a clearer trend.';
    } else {
      verdict = '🟠 Weak momentum/narrative right now';
      horizon = 'No clear edge — better to wait or skip.';
    }
  }

  return { safety, momentum, narrative, verdict, horizon, positives, redFlags };
}

function bar(score: number): string {
  const filled = Math.round(score / 10);
  return '█'.repeat(filled) + '░'.repeat(10 - filled) + ` ${score}/100`;
}

export function formatAnalysis(a: Analysis): string {
  const pos = a.positives.length ? a.positives.slice(0, 8).map((p) => `✅ ${p}`).join('\n') : '—';
  const neg = a.redFlags.length ? a.redFlags.slice(0, 10).map((f) => `• ${f}`).join('\n') : '✅ None detected';
  return [
    `*${a.verdict}*`,
    '',
    `🛡 Safety   ${bar(a.safety)}`,
    `📈 Momentum ${bar(a.momentum)}`,
    `🧠 Narrative ${bar(a.narrative)}`,
    '',
    `🕐 *Horizon:* ${a.horizon}`,
    '',
    `*Strengths:*\n${pos}`,
    '',
    `*Risks / flags:*\n${neg}`,
    '',
    '_⚠️ Educational only — NOT financial advice. Crypto micro-caps can go to zero. DYOR._',
  ].join('\n');
}
