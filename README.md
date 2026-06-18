# Premium Telegram Bot 🤖💸

A production-ready **Telegram bot** with a **free tier** and **paid premium features**, built in **TypeScript**. It ships with everything you need to actually charge users: usage quotas, a paywall, and two payment rails — **Telegram Stars** (in-app, zero setup) and **Stripe** (card subscriptions).

The demo "tool" is a marketing-copy generator, but the feature logic is a single, swappable module — replace it with any value you sell (AI text/images, data lookups, scraping, conversions, etc.) and keep the entire monetization layer for free.

> ⚠️ **Reality check:** No software *guarantees* income. This is a real, working template for a subscription product. Revenue depends on the value you ship and how you market it. Treat any "$X/month guaranteed, 100% free" promise as a scam.

---

## Features

- 🆓 **Free tier** — 5 generations/day per user (configurable)
- ✨ **Premium tier** — unlimited usage + extra output, time-limited (30 days)
- ⭐ **Telegram Stars** payments — works instantly, no merchant account
- 💳 **Stripe** subscriptions — card payments via Checkout + webhooks
- 🗄️ **SQLite** persistence (users, quotas, payments) — zero external DB
- 📊 **Admin commands** — `/stats` for users & revenue, `/grant` to gift premium
- 🧩 **Pluggable core** — swap `src/services/featureService.ts` for your own product

---

## Quick start

```bash
# 1. Install
npm install

# 2. Configure
cp .env.example .env
#   -> set BOT_TOKEN from @BotFather

# 3. Run in dev mode
npm run dev
```

Open Telegram, message your bot `/start`, then try `/gen launching my coffee app`.

---

## Commands

| Command            | Who      | Description                          |
| ------------------ | -------- | ------------------------------------ |
| `/start`, `/help`  | Everyone | Intro & usage                        |
| `/gen <topic>`     | Everyone | Generate output (counts toward quota)|
| `/status`          | Everyone | Show plan & remaining uses           |
| `/upgrade`         | Everyone | Buy premium (Stars or Stripe)        |
| `/stats`           | Admin    | Users, active premium, revenue       |
| `/grant <id> [d]`  | Admin    | Manually grant premium               |

---

## Payments

### Telegram Stars (recommended to start)
Works out of the box — just set `PREMIUM_STARS_PRICE` in `.env`. Telegram handles
the checkout. On success the bot auto-activates premium for 30 days.

### Stripe (card subscriptions)
1. Create a recurring **Price** in the Stripe dashboard, copy its `price_xxx` ID.
2. Fill `STRIPE_SECRET_KEY`, `STRIPE_PRICE_ID`, `STRIPE_WEBHOOK_SECRET`, `PUBLIC_BASE_URL`.
3. Run the webhook server: `npx tsx src/server.ts`
4. Add a Stripe webhook endpoint → `https://yourdomain.com/stripe/webhook`
   listening for `checkout.session.completed`.

---

## Customize the product

All revenue plumbing is reusable. To sell something different, edit one file:

```ts
// src/services/featureService.ts
export function generate(input: string, premium: boolean): GenerateResult {
  // call OpenAI, generate an image, scrape data, convert a file...
  // return more / better output when `premium` is true
}
```

The quota, paywall, and payment layers stay untouched.

---

## Project structure

```
src/
├─ index.ts              # entry point, wires bot + commands
├─ server.ts             # optional Stripe webhook HTTP server
├─ config.ts             # env config & validation
├─ commands/             # /start, /gen, /upgrade, admin
├─ services/             # users, payments, stripe, core feature
└─ db/                   # SQLite schema & connection
```

---

## Deploy

- **Polling mode** (default) runs anywhere Node runs: VPS, Railway, Render, Fly.io.
- Keep the process alive with `pm2`, a systemd unit, or your platform's worker.
- For Stripe, expose `src/server.ts` on a public HTTPS URL.

---

## Build for production

```bash
npm run build
npm start
```

---

## License

MIT — see [LICENSE](./LICENSE).
