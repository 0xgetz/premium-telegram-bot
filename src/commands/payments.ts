import { Bot, InlineKeyboard } from 'grammy';
import { config } from '../config.js';
import { recordPayment } from '../services/paymentService.js';
import { createCheckoutSession } from '../services/stripeService.js';

const PERKS = [
  '✨ *Premium perks:*',
  '• Unlimited copy generations + 6 multi-tone variants & CTA ideas',
  '• Unlimited reminders + 🔁 recurring (daily/weekly)',
  '• Unlimited notes + 🔎 instant search (/find)',
  '• 10 inline results everywhere instead of 3',
  '• Priority support',
].join('\n');

export function registerPaymentCommands(bot: Bot): void {
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

    await ctx.reply(`${PERKS}\n\nChoose a payment method:`, {
      parse_mode: 'Markdown',
      reply_markup: keyboard,
    });
  });

  bot.callbackQuery('buy_stars', async (ctx) => {
    await ctx.answerCallbackQuery();
    await ctx.replyWithInvoice(
      'Premium — 30 days',
      'Unlimited generations, recurring reminders, note search, and more for 30 days.',
      'premium_30d',
      'XTR',
      [{ label: 'Premium 30 days', amount: config.premiumStarsPrice }],
    );
  });

  bot.on('pre_checkout_query', (ctx) => ctx.answerPreCheckoutQuery(true));

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
