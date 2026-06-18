/**
 * Auto-scan trending EVM gems and keep only the ones that pass safety checks.
 *
 * Builds on the existing pipeline:
 *   gemService.trendingGems  -> live trending tokens (DexScreener boosts)
 *   securityService.checkSecurity -> honeypot / contract privileges / holders
 *   analysisService.analyze  -> Safety / Momentum / Narrative scoring + verdict
 *
 * NOT financial advice. This only filters public data with simple heuristics
 * so users can do their own research faster. Crypto micro-caps can go to zero.
 */
import { config } from '../config.js';
import { Pair, trendingGems, shortLine } from './gemService.js';
import { checkSecurity } from './securityService.js';
import { analyze, Analysis } from './analysisService.js';

export interface ScannedGem {
  pair: Pair;
  analysis: Analysis;
}

export interface ScanResult {
  passed: ScannedGem[];
  scanned: number;
}

const opportunity = (a: Analysis): number => a.safety + a.momentum + a.narrative;

/**
 * Fetch trending gems, run each through the full safety + analysis pipeline,
 * and return only those at/above `minSafety` (and not flagged AVOID), sorted by
 * the strongest combined opportunity (safety + momentum + narrative).
 */
export async function scanTrending(
  limit = 12,
  minSafety = config.gemScanMinSafety,
): Promise<ScanResult> {
  const gems = await trendingGems(limit);

  const scored = await Promise.all(
    gems.map(async (pair): Promise<ScannedGem | null> => {
      try {
        const sec = await checkSecurity(pair.baseToken.address, pair.chainId);
        return { pair, analysis: analyze(pair, sec) };
      } catch {
        return null;
      }
    }),
  );

  const valid = scored.filter((g): g is ScannedGem => g !== null);
  const passed = valid
    .filter((g) => g.analysis.safety >= minSafety && !g.analysis.verdict.startsWith('🛑'))
    .sort((a, b) => opportunity(b.analysis) - opportunity(a.analysis));

  return { passed, scanned: valid.length };
}

/** One-line-ish summary of a scanned gem for the /safegems list. */
export function formatScannedGem(g: ScannedGem): string {
  const a = g.analysis;
  return [
    shortLine(g.pair),
    `🛡 ${a.safety}/100 · 📈 ${a.momentum}/100 · 🧠 ${a.narrative}/100`,
    a.verdict,
    `\`${g.pair.baseToken.address}\``,
  ].join('\n');
}
