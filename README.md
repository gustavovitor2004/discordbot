# Discord Bot

A simple Discord bot that monitors a forum channel and mentions specific users based on post tags ("Site" or "Server").

## Features

- Detects new forum threads with tags
- Mentions designated users:
  - `<@275359225545359360>` for **Site**
  - `<@395387932372107264>` for **Server**
- Slash commands:
  - `/ping` — Check bot latency
  - `/status` — Show bot status (uptime, memory, etc.)
  - `/restart` — Restart the bot (admin only)
  - `/help` — List all available commands
- Auto-restart support via PM2
- Graceful login retry on disconnect

## Setup

1. Clone the repo:

   ```bash
   git clone https://github.com/gustavovitor2004/discordbot.git
   cd discordbot

Install dependencies:Bashnpm install
Create a .env file in the root folder:textTOKEN=your_discord_bot_token_hereImportant: Never commit your .env file or real token to GitHub! Add .env to .gitignore.
Run the bot with PM2 (recommended for production):Bashpm2 start index.js --name discordbot
pm2 saveTo restart later:Bashpm2 restart discordbot

Requirements

Node.js v18 or higher
discord.js v14+
PM2 (for production and auto-start)

License
MIT License
Feel free to fork, modify, and use!
