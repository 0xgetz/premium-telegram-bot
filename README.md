# Free Telegram Bot 🤖💚

A **100% free, open-source** Telegram bot built in **TypeScript** — no paywall, no limits, no tracking pixels. It ships with several features that are **rare in other Telegram bots**, all running **offline with zero paid APIs**.

> 💚 Everything here is free and unlimited. There is no premium tier, no payment, and no usage cap.

---

## ✨ Features most bots don't have

| Feature | What it does |
| --- | --- |
| 🔮 **Inline mode** | Use the bot in **any chat** — type `@your_bot your topic` and pick a result to send. No need to open the bot's own chat. |
| ⏰ **Natural-language reminders** | `/remind in 2 hours drink water`, `/remind tomorrow at 9am standup`. Parsed with [chrono-node]. **Persisted in SQLite, so reminders survive restarts.** |
| 💥 **Self-destructing messages** | `/sd 10 secret` posts a message that auto-deletes after N seconds (and removes your command too, in groups where the bot is admin). |
| 🔳 **Offline QR codes** | `/qr <text or url>` renders a QR image locally — no third-party QR service. |
| 📝 **Cross-device notes** | `/save <anything>` and `/notes`. Your clipboard/notes sync across every device where you use the bot. |
| 🪄 **Copy generator** | `/gen <topic>` produces catchy marketing copy (also available via inline mode). |

---

## Quick start

```bash
npm install
cp .env.example .env      # set BOT_TOKEN from @BotFather
npm run dev
```

Message your bot `/start`.

### Enable inline mode (one-time)
In [@BotFather] → your bot → **Bot Settings → Inline Mode → Turn on**.
Then anyone can type `@your_bot something` in any chat.

---

## Commands

| Command | Description |
| --- | --- |
| `/start`, `/help` | Intro & usage |
| `/gen <topic>` | Generate marketing copy (also works inline) |
| `/remind <when> <what>` | Set a natural-language reminder |
| `/reminders` | List & delete your reminders |
| `/qr <text>` | Generate a QR code image |
| `/sd <seconds> <msg>` | Self-destructing message |
| `/save <text>` / `/notes` | Personal cross-device notes |
| `/status` | Your usage count (it's all free) |
| `/stats` | Admin-only usage metrics |

---

## Project structure

```
src/
├─ index.ts                  # entry point, wires everything + reminder scheduler
├─ config.ts                 # env config & validation
├─ commands/
│  ├─ basic.ts               # /start /help /status
│  ├─ generate.ts            # /gen
│  ├─ reminders.ts           # /remind /reminders
│  ├─ utilities.ts           # /qr /sd
│  ├─ notes.ts               # /save /notes
│  ├─ inline.ts              # inline mode
│  └─ admin.ts               # /stats
├─ services/
│  ├─ featureService.ts      # the copy generator (swap for your own logic)
│  ├─ reminderService.ts     # persistent reminder scheduler
│  └─ userService.ts         # lightweight user tracking
└─ db/database.ts            # SQLite schema (users, reminders, notes)
```

---

## Customize

The copy generator is a single, swappable module: `src/services/featureService.ts`.
Replace it with anything you like (translation, summaries, conversions, etc.) — the
inline, reminders, notes, and utility features keep working unchanged.

---

## Deploy

Polling mode runs anywhere Node 20+ runs (VPS, Railway, Render, Fly.io). Keep the
process alive with `pm2` or a systemd unit. SQLite persists reminders and notes to disk.

```bash
npm run build && npm start
```

---

## License

MIT — see [LICENSE](./LICENSE).

[chrono-node]: https://github.com/wanasit/chrono
[@BotFather]: https://t.me/BotFather
