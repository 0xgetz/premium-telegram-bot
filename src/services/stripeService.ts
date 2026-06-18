import Stripe from 'stripe';
import { config } from '../config.js';
import { recordPayment } from './paymentService.js';

let stripe: Stripe | null = null;
if (config.stripe.enabled) {
  stripe = new Stripe(config.stripe.secretKey);
}

/** Creates a Stripe Checkout session and returns the payment URL. */
export async function createCheckoutSession(telegramId: number): Promise<string> {
  if (!stripe) throw new Error('Stripe is not configured');
  const session = await stripe.checkout.sessions.create({
    mode: 'subscription',
    line_items: [{ price: config.stripe.priceId, quantity: 1 }],
    success_url: `${config.stripe.publicBaseUrl}/success`,
    cancel_url: `${config.stripe.publicBaseUrl}/cancel`,
    client_reference_id: String(telegramId),
    metadata: { telegram_id: String(telegramId) },
  });
  if (!session.url) throw new Error('Stripe did not return a checkout URL');
  return session.url;
}

/**
 * Verifies and handles a Stripe webhook event.
 * Wire this to an HTTP endpoint (see README) to auto-activate premium on payment.
 */
export function handleWebhook(rawBody: Buffer, signature: string): void {
  if (!stripe) throw new Error('Stripe is not configured');
  const event = stripe.webhooks.constructEvent(
    rawBody,
    signature,
    config.stripe.webhookSecret,
  );

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session;
    const telegramId = Number(session.metadata?.telegram_id ?? session.client_reference_id);
    if (telegramId) {
      recordPayment({
        telegramId,
        provider: 'stripe',
        amount: session.amount_total ?? 0,
        currency: session.currency ?? 'usd',
        reference: session.id,
        premiumDays: 30,
      });
    }
  }
}
