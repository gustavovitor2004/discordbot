<div align="center">

# 🏆 Trophi.gg — Discord Bot

The official Discord bot for [**Trophi.gg**](https://trophi.gg) — the home for completionists, trophy hunters, and players who love mastering their games.

*Track. Master. Achieve.*

[![Node.js](https://img.shields.io/badge/Node.js-18%2B-43853D?style=flat-square&logo=node.js&logoColor=white)](https://nodejs.org)
[![discord.js](https://img.shields.io/badge/discord.js-v14-5865F2?style=flat-square&logo=discord&logoColor=white)](https://discord.js.org)
[![PM2](https://img.shields.io/badge/PM2-ready-2B037A?style=flat-square&logo=pm2&logoColor=white)](https://pm2.keymetrics.io)
[![License](https://img.shields.io/badge/license-MIT-blue?style=flat-square)](LICENSE)
[![Status](https://img.shields.io/badge/phase-pre--launch-orange?style=flat-square)]()

</div>

---

## 📖 Table of Contents

- [About](#-about)
- [Features](#-features)
- [Tech Stack](#%EF%B8%8F-tech-stack)
- [Quick Start](#-quick-start)
- [Configuration](#%EF%B8%8F-configuration)
- [Project Structure](#-project-structure)
- [Running in Production](#-running-in-production)
- [Adding New Commands & Events](#-adding-new-commands--events)
- [Roadmap](#%EF%B8%8F-roadmap)
- [Contributing](#-contributing)
- [License](#-license)

---

## 🎯 About

This bot is the central automation layer for the Trophi.gg Discord community. It handles **onboarding**, **feedback collection**, **forum-tag routing**, and **structured logging** — and is built on a modular auto-loading architecture so new commands and events drop in without touching the core.

The bot follows the phased plan defined in [`DISCORD_SERVER.md`](DISCORD_SERVER.md) and is currently in the **Pre-Launch** phase, focused on community foundations before the public release of the platform.

---

## ✨ Features

### 🤖 Slash Commands

| Command | Description | Access |
|---|---|---|
| `/welcome-info` | Quick overview of the server with channel pointers | Everyone |
| `/feedback <type>` | Send a bug, feature request, or general feedback via modal | Everyone |
| `/ping` | Show WebSocket and API latency | Everyone |
| `/status` | Bot status — uptime, memory, servers, versions | Everyone |
| `/tags` | Display configured forum-tag → mention rules | Everyone |
| `/help` | List all commands grouped by category | Everyone |
| `/restart` | Restart the bot via PM2 | Admin only |

### ⚡ Automation

- **🎉 Welcome flow** — New members are greeted in `#welcome` with onboarding steps and personalized embed
- **🏷️ Forum tag routing** — Auto-mentions configured users when forum threads are created with matching tags (supports multiple users per tag)
- **📡 Channel logging** — Every event (joins, leaves, commands, errors, forum activity) is mirrored to `#auto-log` as a structured embed
- **🔄 Graceful restart** — `/restart` posts a confirmation message back in the channel after PM2 brings the bot up
- **🛡️ Cooldowns** — Per-user, per-command rate limiting with auto-cleanup (no memory leaks)

### 🏗️ Architecture

- **Auto-loader** — drop a file in `src/commands/` or `src/events/` and it's wired up automatically
- **Event-driven** — clean separation between commands, events, and utilities
- **Branded embeds** — consistent visual identity across every response
- **Modal-based forms** — `/feedback` uses Discord modals for structured input
- **Resilient login** — automatic retry with exponential backoff on disconnect

---

## 🛠️ Tech Stack

- **Runtime:** Node.js 18+
- **Framework:** [discord.js](https://discord.js.org) v14
- **Config:** dotenv + JSON
- **Process Manager:** PM2 (recommended for production)

---

## 🚀 Quick Start

### Prerequisites

- Node.js **v18 or higher** ([download](https://nodejs.org))
- A Discord bot application — create one at the [Discord Developer Portal](https://discord.com/developers/applications)
- (Optional) PM2 globally installed: `npm install -g pm2`

### 1. Clone and install

```bash
git clone https://github.com/gustavovitor2004/discordbot.git
cd discordbot
npm install
```

### 2. Create your `.env`

```env
DISCORD_TOKEN=your_bot_token_here
```

> ⚠️ **Never commit `.env` to git.** It is already listed in `.gitignore`.

### 3. Configure `config.json`

Fill in the IDs for your guild and channels (see [Configuration](#%EF%B8%8F-configuration) below).

### 4. Enable bot intents on the Developer Portal

In your bot's settings, under **Bot → Privileged Gateway Intents**, enable:

- ✅ **Server Members Intent**
- ✅ **Message Content Intent**

### 5. Invite the bot to your server

Use this URL (replace `CLIENT_ID` with your bot's Application ID):

```
https://discord.com/api/oauth2/authorize?client_id=CLIENT_ID&permissions=274878221376&scope=bot%20applications.commands
```

### 6. Run

```bash
# Development
node index.js

# Production (PM2)
pm2 start index.js --name discordbot
pm2 save
```

When the bot starts, you should see:

```
[LOADER] Loaded command: /welcome-info (community)
[LOADER] Loaded command: /feedback (staff)
[LOADER] Loaded command: /ping (utility)
... (more)
[COMMANDS] Registered 7 slash commands
[READY] Bot online as TrophiBot#1234
```

---

## ⚙️ Configuration

All configuration lives in [`config.json`](config.json). Sensitive values stay in `.env`.

```json
{
  "clientId": "YOUR_BOT_APPLICATION_ID",
  "guildId": "YOUR_SERVER_ID",
  "channels": {
    "welcome": "channel_id",
    "rules": "channel_id",
    "roles": "channel_id",
    "generalChat": "channel_id",
    "feedback": "channel_id",
    "autoLog": "channel_id",
    "showAchievements": "channel_id"
  },
  "tagMentions": {
    "Site": ["user_id_1", "user_id_2"],
    "Server": ["user_id_3"]
  },
  "cooldowns": {
    "ping": 3,
    "status": 5,
    "feedback": 60
  },
  "branding": {
    "primaryColor": 5793266,
    "siteUrl": "https://trophi.gg",
    "tagline": "Track. Master. Achieve."
  }
}
```

### Configuration reference

| Key | Type | Description |
|---|---|---|
| `clientId` | string | Discord application ID (from the Developer Portal) |
| `guildId` | string | The server ID where the bot operates |
| `channels.*` | string | Channel IDs — empty values disable that feature gracefully |
| `tagMentions` | object | Map a forum tag name to one or more user IDs (array form supported) |
| `cooldowns.*` | number | Per-command cooldown in seconds |
| `branding.*` | mixed | Brand colors and links shown in embeds |

> 💡 **Tip:** Enable **Developer Mode** in Discord (Settings → Advanced) to right-click any server, channel, or user and copy its ID.

---

## 📂 Project Structure

```
discordbot/
├── index.js                  # Bootstrap — client, loaders, login
├── config.json               # Channels, tags, cooldowns, branding
├── .env                      # DISCORD_TOKEN (not committed)
├── package.json
├── README.md
└── src/
    ├── loader.js             # Auto-discovers commands & events
    ├── commands/
    │   ├── utility/          # ping, status, help, restart, tags
    │   ├── community/        # welcome-info
    │   └── staff/            # feedback (modal-based)
    ├── events/
    │   ├── ready.js
    │   ├── guildMemberAdd.js
    │   ├── guildMemberRemove.js
    │   ├── threadCreate.js
    │   └── interactionCreate.js
    └── utils/
        ├── embeds.js         # Branded embed builders + helpers
        ├── cooldowns.js      # Per-user, per-command rate limiter
        └── logger.js         # Console + #auto-log channel logger
```

---

## 🚢 Running in Production

### Linux / macOS

```bash
pm2 start index.js --name discordbot
pm2 save
pm2 startup        # generates a systemd hook to auto-start on boot
```

### Windows

`pm2 startup` does not work on Windows — use the helper instead:

```powershell
npm install -g pm2-windows-startup
pm2-startup install
pm2 start index.js --name discordbot
pm2 save
```

### Useful PM2 commands

```bash
pm2 logs discordbot       # tail logs in real time
pm2 restart discordbot    # restart (also works via /restart on Discord)
pm2 stop discordbot       # stop
pm2 status                # status of all processes
pm2 monit                 # interactive monitoring dashboard
```

---

## 🧩 Adding New Commands & Events

The auto-loader picks up any valid file under `src/commands/` or `src/events/` on startup. **Zero boilerplate to register**.

### New command

Drop a file at `src/commands/<group>/<name>.js`:

```js
const { SlashCommandBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('mycommand')
    .setDescription('Does something cool'),

  // Optional fields:
  // group: 'utility',     // overrides folder-based grouping
  // skipCooldown: true,   // bypass the cooldown system

  async execute(interaction, { client, config, logger, registry }) {
    await interaction.reply('Hello world!');
  }
};
```

### New event

Drop a file at `src/events/<eventName>.js`:

```js
module.exports = {
  name: 'messageCreate',
  // once: true,  // for one-shot events like 'ready'

  async execute(message, { client, config, logger }) {
    if (message.author.bot) return;
    // ...
  }
};
```

### Modal handler (inside a command)

If your command opens a modal, export a `handleModal` and the central interaction router will dispatch to it:

```js
async handleModal(interaction, ctx) {
  if (!interaction.customId.startsWith('mycommand:')) return false;
  // ... process modal
  return true;
}
```

See [`src/commands/staff/feedback.js`](src/commands/staff/feedback.js) for a full reference implementation.

---

## 🗺️ Roadmap

This bot follows the phased plan in [`DISCORD_SERVER.md`](DISCORD_SERVER.md).

- [x] **Pre-Launch** — onboarding, feedback flow, forum mentions, channel logging, auto-loader architecture
- [ ] **MVP (Early Access)** — `/poll`, `/weekly-topic`, auto-thread on `#achievement-help`
- [ ] **V1 (Public)** — `/achievement`, `/missable`, `/build`, `/route` powered by the Trophi API
- [ ] **V2 (Mature)** — `/trophi-sync` OAuth2, personal mastery summaries, marketplace integration, premium-tier verification

---

## 🤝 Contributing

Contributions, ideas, and bug reports are welcome.

1. Fork the repo
2. Create a feature branch (`git checkout -b feat/my-feature`)
3. Commit your changes
4. Push and open a Pull Request

Please follow the existing code style (CommonJS, async/await, branded embeds via `src/utils/embeds.js`).

---

## 📜 License

[MIT](LICENSE) — feel free to fork, modify, and use.

---

<div align="center">

Built with ❤️ for the Trophi.gg community.

[Website](https://trophi.gg) • [Report an Issue](https://github.com/gustavovitor2004/discordbot/issues)

</div>
