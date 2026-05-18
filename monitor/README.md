# Trophibot — Real-Time Monitor

A standalone web dashboard that watches a Discord bot and the Trophi.gg forum in real time.

![Status](https://img.shields.io/badge/dashboard-localhost-5865F2?style=flat-square)
![Node.js](https://img.shields.io/badge/node-%E2%89%A518-43853D?style=flat-square)
![discord.js](https://img.shields.io/badge/discord.js-v14-5865F2?style=flat-square)

## What it shows

| Card | Description |
|---|---|
| **Bot status** | `connecting` / `online` / `reconnecting` / `offline` |
| **Uptime** | Live `dd:hh:mm:ss` ticker since last successful connection |
| **WebSocket ping** | Refreshed every 15 seconds |
| **Guilds** | Live count of servers the monitor sees |
| **Tag alerts** | Counters for `Site` and `Server` forum tags (case-sensitive) |
| **Activity log** | Last 10 events with timestamps and levels |
| **Commands** | Static reference for `/ping`, `/status`, `/restart`, `/help` |

The dashboard auto-reconnects to the monitor over WebSocket if you reload or the monitor restarts.

## Install

```bash
cd monitor
npm install
cp .env.example .env
# edit .env and paste a bot token
```

> 💡 You can use a **dedicated monitor bot** (recommended) so the main bot's permissions stay clean. The monitor only needs Read access to the guild and forum.

## Run

```bash
# foreground (dev)
npm start

# with file-watch hot reload
npm run dev

# with PM2 (production)
npm run pm2:start
```

Then open: <http://localhost:3000>

## How it works

```
+------------------+      WebSocket Gateway       +-----------------+
| Discord servers  |  <-------------------------- | monitor.js      |
+------------------+                              |                 |
                                                  | - tracks state  |
                                                  | - serves HTML   |
                                                  | - WS broadcast  |
                                                  +-------+---------+
                                                          |
                                                  WebSocket (local)
                                                          |
                                                  +-------v---------+
                                                  | dashboard.html  |
                                                  | (browser)       |
                                                  +-----------------+
```

The monitor connects to Discord with its own bot token, watches `threadCreate` events, and pushes a JSON snapshot to every connected dashboard client over WebSocket — initially on connect, then on every event, and on a 15-second tick.

## Security

- Binds to `127.0.0.1` by default. The dashboard is not exposed on your network unless you set `HOST=0.0.0.0`.
- No authentication on the dashboard — keep it local-only or put it behind a reverse proxy with auth.
- The bot token lives in `.env` (gitignored by the parent `.gitignore`).
- All process-level errors (`unhandledRejection`, `uncaughtException`) are caught — PM2 won't see crashes from bad input or transient network errors.

## Files

| File | Purpose |
|---|---|
| `monitor.js` | Main process: Discord client + HTTP + WebSocket server |
| `dashboard.html` | Self-contained UI served at `/` |
| `package.json` | Dependencies and scripts |
| `.env.example` | Template for required env vars |

## License

MIT
