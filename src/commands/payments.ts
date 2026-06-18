import { Bot, InlineKeyboard } from 'grammy';
import { config } from '../config.js';
import { recordPayment } from '../services/paymentService.js';
import { createCheckoutSession } from '../services/stripeService.js';

export function registerPaymentCommands(bot: Bot): void {
  // /upgrade — show purchase options
  bot.command('upgrade', async (ctx) => {
    const u = ctx.from;
    if (!u) return;

    const keyboard = new InlineKeyboard().text(
      `⭐ Pay ${config.premiumStarsPrice} Stars (in-app)`,
      'buy_stars',
    );

    if (config.stripe.enabled) {
      try {
        const url = await createCheckoutSession(u.id);
        keyboard.row().url('💳 Pay with card (Stripe)', url);
      } catch (e) {
        console.error('Stripe checkout error:', e);
      }
    }

    await ctx.reply(
      '*Go Premium* 🚀\n\n• Unlimited generations\n• Extra premium variants + CTA suggestions\n• Priority support\n\nChoose a payment method:',
      { parse_mode: 'Markdown', reply_markup: keyboard },
    );
  });

  // Telegram Stars invoice
  bot.callbackQuery('buy_stars', async (ctx) => {
    await ctx.answerCallbackQuery();
    await ctx.replyWithInvoice(
      'Premium — 30 days',
      'Unlimited generations and premium variants for 30 days.',
      'premium_30d',
      'XTR', // Telegram Stars currency
      [{ label: 'Premium 30 days', amount: config.premiumStarsPrice }],
    );
  });

  // Required: approve the pre-checkout
  bot.on('pre_checkout_query', (ctx) => ctx.answerPreCheckoutQuery(true));

  // Successful Telegram Stars payment
  bot.on('message:successful_payment', async (ctx) => {
    const sp = ctx.message.successful_payment;
    const u = ctx.from;
    if (!u) return;
    recordPayment({
      telegramId: u.id,
      provider: 'telegram_stars',
      amount: sp.total_amount,
      currency: sp.currency,
      reference: sp.telegram_payment_charge_id,
      premiumDays: 30,
    });
    await ctx.reply('✅ Payment received — *Premium activated for 30 days!* Enjoy 🎉', {
      parse_mode: 'Markdown',
    });
  });
}
