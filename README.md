# Discord Bot

A simple Discord bot that monitors a forum channel and mentions specific users based on post tags ("Site" or "Server").

## Features
- Detects new forum threads with tags
- Mentions designated users: <@275359225545359360> for "Site", <@395387932372107264> for "Server"
- Slash commands: `/ping`, `/status`, `/restart` (admin only), `/help`
- Auto-restart support via PM2
- Graceful login retry on disconnect

## Setup
1. Clone the repo:
   ```bash
   git clone https://github.com/gustavovitor2004/discordbot.git
   cd discordbot
   
2. Install dependencies:
   npm install

3. Create .env file:
   TOKEN=your_discord_bot_token_here

4. Run with PM2:Bash
   pm2 start index.js --name discordbot
   pm2 save

Requirements
Node.js v18+
discord.js v14+
PM2 (for production)
LicenseMIT
