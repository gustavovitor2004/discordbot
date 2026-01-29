# Discord Bot

A simple Discord bot that monitors a forum channel and notifies specific users based on post tags ("Site" or "Server").

![Discord Badge](https://img.shields.io/badge/Discord-5865F2?style=for-the-badge&logo=discord&logoColor=white)
![Node.js Badge](https://img.shields.io/badge/Node.js-20-green?style=for-the-badge&logo=node.js&logoColor=white)
![discord.js Badge](https://img.shields.io/badge/discord.js-v14-blue?style=for-the-badge&logo=discord&logoColor=white)

## Features

- Automatically detects new forum threads with tags
- Mentions designated users:
  - `<@275359225545359360>` for **Site**
  - `<@395387932372107264>` for **Server**
- Slash commands:
  - `/ping` — Check bot latency
  - `/status` — Show bot status (uptime, memory, latency)
  - `/restart` — Restart the bot (admin only)
  - `/help` — List all available commands
- Auto-restart support with PM2
- Graceful reconnection and login retry on disconnect

## Setup

1. **Clone the repository**

   ```bash
   git clone https://github.com/gustavovitor2004/discordbot.git
   cd discordbot

2. **Install dependencies:**
 - npm install

3. **Create a .env file:**
 - Create a file named .env in the root folder and add your token:
 - TOKEN=your_discord_bot_token_here
   
**Important!!**
Never commit your .env file or real token to GitHub!
Make sure .env is listed in .gitignore.

4. **Run the bot with PM2 (recommended for production):**
  - pm2 start index.js --name discordbot
  - pm2 save

To restart later (anytime you need):
  - pm2 restart discordbot
  
Requirements

Node.js v18 or higher
discord.js v14+
PM2 (for production and auto-start)

License
MIT License
Feel free to fork, modify, and use!
