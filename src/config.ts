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
