import { db } from '../db/database.js';
import { grantPremium } from './userService.js';

const insertPayment = db.prepare(
  `INSERT INTO payments (telegram_id, provider, amount, currency, reference, created_at)
   VALUES (?, ?, ?, ?, ?, ?)`,
);

/** Records a successful payment and activates premium for the user. */
export function recordPayment(opts: {
  telegramId: number;
  provider: 'telegram_stars' | 'stripe';
  amount: number;
  currency: string;
  reference?: string;
  premiumDays?: number;
}): void {
  insertPayment.run(
    opts.telegramId,
    opts.provider,
    opts.amount,
    opts.currency,
    opts.reference ?? null,
    Date.now(),
  );
  grantPremium(opts.telegramId, opts.premiumDays ?? 30);
}
