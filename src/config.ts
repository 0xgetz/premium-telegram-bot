import 'dotenv/config';

function required(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export const config = {
  botToken: required('BOT_TOKEN'),
  databasePath: process.env.DATABASE_PATH ?? './data/bot.db',
  premiumStarsPrice: Number(process.env.PREMIUM_STARS_PRICE ?? 250),
  // Max size (MB) for downloads — Telegram bots can send up to ~50MB.
  maxDownloadMb: Number(process.env.MAX_DOWNLOAD_MB ?? 49),
  // Price move (%) that triggers a watchlist alert.
  gemAlertPercent: Number(process.env.GEM_ALERT_PERCENT ?? 20),
  // Trending auto-scan: minimum Safety score (0-100) a token must reach to be shown in /safegems.
  gemScanMinSafety: Number(process.env.GEM_SCAN_MIN_SAFETY ?? 60),
  // "Narrative rising" alert (premium): 24h volume must rise by at least this % vs baseline.
  gemVolumeSurgePercent: Number(process.env.GEM_VOLUME_SURGE_PERCENT ?? 100),
  // ...and holder count must rise by at least this % vs baseline.
  gemHolderSurgePercent: Number(process.env.GEM_HOLDER_SURGE_PERCENT ?? 15),
  // Minimum hours between narrative alerts for the same token (anti-spam).
  gemNarrativeCooldownHours: Number(process.env.GEM_NARRATIVE_COOLDOWN_HOURS ?? 6),
  // --- Launch sniffer (Trojan-style new-pair radar) ---
  // Default minimum Safety score (0-100) a fresh launch must clear to be sniffed.
  sniperMinSafety: Number(process.env.SNIPER_MIN_SAFETY ?? 65),
  // Default minimum liquidity (USD).
  sniperMinLiquidity: Number(process.env.SNIPER_MIN_LIQUIDITY ?? 15000),
  // Default minimum 24h volume (USD).
  sniperMinVolume: Number(process.env.SNIPER_MIN_VOLUME ?? 10000),
  // Only consider pairs created within this many minutes (0 = no age cap).
  sniperMaxAgeMin: Number(process.env.SNIPER_MAX_AGE_MIN ?? 180),
  // How often the radar polls for new launches (seconds).
  sniperPollSeconds: Number(process.env.SNIPER_POLL_SECONDS ?? 120),
  adminIds: (process.env.ADMIN_IDS ?? '')
    .split(',')
    .map((id) => id.trim())
    .filter(Boolean)
    .map(Number),
  stripe: {
    secretKey: process.env.STRIPE_SECRET_KEY ?? '',
    priceId: process.env.STRIPE_PRICE_ID ?? '',
    webhookSecret: process.env.STRIPE_WEBHOOK_SECRET ?? '',
    publicBaseUrl: process.env.PUBLIC_BASE_URL ?? '',
    get enabled() {
      return Boolean(this.secretKey && this.priceId);
    },
  },
};
