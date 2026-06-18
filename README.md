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
- ⬇️ **Media downloaders** — `/mp3 <url>` and `/video <url>` via [yt-dlp] (size-capped to Telegram's limit). Only for content you have the right to download.
- 💎 **EVM gems tracker** — `/gem` / `/gems` / `/findtoken`: live price, liquidity, volume, FDV, age via free [DexScreener] API.
- 🛡 **Honeypot & scam detection** — `/honeypot <address>` simulates a real buy & sell ([honeypot.is]) and reports buy/sell tax, verification, proxy, top-holder %, plus [GoPlus] privileges (mintable, hidden owner, blacklist, pausable).
- 🔬 **Buy/hold analysis** — `/scan <address>` scores **Safety**, **Momentum**, and **Narrative** (socials, trending, volume surge, holders), then gives a verdict + suggested horizon (scalp hours vs swing days). *Educational only — not financial advice.*
- 🛡 **Safety auto-scan** — `/safegems` runs **every** trending gem through the full honeypot + contract + analysis pipeline and shows **only the tokens that pass safety** (configurable min Safety score), sorted by combined opportunity. No more scanning each address by hand.
- 🧠📈 **"Narasi naik" alerts (premium)** — watchlisted tokens are monitored for a **rising narrative**: a simultaneous **24h volume surge + holder growth**. When both fire together you get a "narasi naik" alert (with a built-in cooldown so it never spams).

---

## ⚙️ Prerequisites for downloaders

`/mp3` and `/video` shell out to **yt-dlp** + **ffmpeg** — install them on the host:

```bash
pip install -U yt-dlp       # or: brew install yt-dlp
sudo apt install ffmpeg     # or: brew install ffmpeg
```

The gems tracker and safety checks need **no install and no API key** (public DexScreener / honeypot.is / GoPlus endpoints).

---

## 🧰 30+ built-in tools (all offline, no paid APIs)

**Text & encoding:** `/calc` `/b64` `/unb64` `/hash` `/case` `/reverse` `/count` `/morse` `/rot13` `/slug` `/json`
**Generators:** `/pw` `/uuid` `/lorem` `/pick` `/roll` `/flip`
**Convert & calculate:** `/convert` `/roman` `/base` `/bmi` `/split` `/pct` `/age` `/datediff` `/color` `/time`
**Productivity:** `/todo` `/poll` `/countdown` `/pomodoro`
**Downloaders (yt-dlp):** `/mp3` `/video`
**EVM gems tracker (DexScreener):** `/gem` `/findtoken` `/gems` `/safegems`
**Token safety (honeypot.is + GoPlus):** `/honeypot` `/scan` (safety + buy/hold analysis) · `/safegems` (auto-scan trending, safe-only)
**Premium extras:** `/habit` (streak tracker) · `/spend` + `/expenses` (expense tracker) · `/find` (note search) · `/watch` + `/watchlist` (token price + "narasi naik" alerts) · recurring reminders

Send any command with no arguments to see its usage. `/tools` lists everything.

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

[chrono-node]: https://github.com/wanasit/chrono
[@BotFather]: https://t.me/BotFather
[yt-dlp]: https://github.com/yt-dlp/yt-dlp
[DexScreener]: https://docs.dexscreener.com/api/reference
[honeypot.is]: https://honeypot.is
[GoPlus]: https://docs.gopluslabs.io/reference/api-overview
