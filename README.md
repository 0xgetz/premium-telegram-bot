# Premium Telegram Bot 🤖✨

A feature-rich Telegram bot in **TypeScript** with a **generous free tier** and a **genuinely compelling premium upgrade** — not an artificial paywall. It ships with features that are **rare in other bots** and two payment rails: **Telegram Stars** (in-app, zero setup) and **Stripe** (card subscriptions).

> 💡 Design philosophy: free users should be *delighted*, premium users should feel the upgrade is *obviously worth it*.

---

## Free vs Premium

| Feature | 🆓 Free | ✨ Premium |
| --- | --- | --- |
| 🪄 Copy generator (`/gen`) | 10/day, 2 variants | **Unlimited**, 6 multi-tone variants + CTA ideas |
| ⏰ Reminders (`/remind`) | up to 5 active | **Unlimited + recurring** (daily/weekly) |
| 📝 Notes (`/save` `/notes`) | up to 20 | **Unlimited + search** (`/find`) |
| 🔮 Inline mode (`@bot ...`) | 3 results | **10 results** |
| 🔳 QR codes (`/qr`) | ✅ unlimited | ✅ unlimited |
| 💥 Self-destruct (`/sd`) | ✅ unlimited | ✅ unlimited |

---

## ✨ Rare features

- 🔮 **Inline mode** — use the bot in **any chat**: type `@your_bot your topic`.
- ⏰ **Natural-language reminders** — `in 2 hours`, `tomorrow at 9am`, `friday 18:00`. Premium adds `every day 8am`/`every week` recurring. Persisted in SQLite, **survives restarts**.
- 💥 **Self-destructing messages** — `/sd 10 secret` auto-deletes after N seconds.
- 🔳 **Offline QR codes** — `/qr <text>` renders locally, no third-party service.
- 📝 **Cross-device notes** — `/save` / `/notes`, with premium full-text `/find`.

---

## Quick start

```bash
npm install
cp .env.example .env      # set BOT_TOKEN from @BotFather
npm run dev
```

Message your bot `/start`.

**Enable inline mode:** [@BotFather] → your bot → Bot Settings → Inline Mode → On.

---

## Payments

### Telegram Stars (recommended to start)
Works out of the box — set `PREMIUM_STARS_PRICE` in `.env`. Telegram handles checkout
and the bot auto-activates premium for 30 days.

### Stripe (card subscriptions)
1. Create a recurring **Price**, copy its `price_xxx` ID.
2. Fill `STRIPE_SECRET_KEY`, `STRIPE_PRICE_ID`, `STRIPE_WEBHOOK_SECRET`, `PUBLIC_BASE_URL`.
3. Run the webhook server: `npx tsx src/server.ts`
4. Add a Stripe webhook → `https://yourdomain.com/stripe/webhook` (`checkout.session.completed`).

---

## Commands

| Command | Who | Description |
| --- | --- | --- |
| `/start`, `/help` | Everyone | Intro & usage |
| `/gen <topic>` | Everyone | Generate copy (counts toward daily quota) |
| `/remind <when> <what>` | Everyone | Natural-language reminder (recurring = premium) |
| `/reminders` | Everyone | List & delete reminders |
| `/qr <text>` | Everyone | QR code image |
| `/sd <seconds> <msg>` | Everyone | Self-destructing message |
| `/save` / `/notes` | Everyone | Personal cross-device notes |
| `/find <keyword>` | Premium | Search your notes |
| `/status` | Everyone | Plan & remaining quota |
| `/upgrade` | Everyone | Buy premium (Stars or Stripe) |
| `/stats`, `/grant` | Admin | Metrics / manual premium grant |

---

## Project structure

```
src/
├─ index.ts                  # entry point, wires everything + reminder scheduler
├─ server.ts                 # optional Stripe webhook HTTP server
├─ config.ts                 # env config & validation
├─ commands/                 # basic, generate, reminders, utilities, notes, inline, payments, admin
├─ services/                 # featureService, reminderService, userService, paymentService, stripeService
└─ db/database.ts            # SQLite schema (users, payments, reminders, notes)
```

---

## Customize the product

All revenue + tier logic is reusable. To sell something different, edit one file:
`src/services/featureService.ts`. Return richer output when `premium` is true; the
quota, paywall, reminders, notes, and inline features keep working unchanged.

---

## Deploy

Polling mode runs anywhere Node 20+ runs (VPS, Railway, Render, Fly.io). Keep alive with
`pm2` or systemd. For Stripe, expose `src/server.ts` on a public HTTPS URL.

```bash
npm run build && npm start
```

---

## License

MIT — see [LICENSE](./LICENSE).

[@BotFather]: https://t.me/BotFather
