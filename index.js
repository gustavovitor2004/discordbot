require('dotenv').config();

const path = require('path');
const {
  Client,
  GatewayIntentBits,
  Partials,
  REST,
  Routes
} = require('discord.js');

const config = require('./config.json');
const logger = require('./src/utils/logger');
const { loadCommands, loadEvents } = require('./src/loader');

const TOKEN = process.env.DISCORD_TOKEN;
const CLIENT_ID = config.clientId;
const GUILD_ID = config.guildId;

if (!TOKEN) {
  console.error('[FATAL] DISCORD_TOKEN is not set in .env file!');
  process.exit(1);
}

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers
  ],
  partials: [Partials.Channel, Partials.Message, Partials.ThreadMember, Partials.GuildMember]
});

logger.init(client);

const registry = loadCommands(path.join(__dirname, 'src', 'commands'));

const ctx = { client, config, logger, registry };

loadEvents(client, path.join(__dirname, 'src', 'events'), ctx);

client.on('error', err => logger.error('CLIENT', err.message));
client.on('warn', warn => logger.warn('CLIENT', warn));

process.on('unhandledRejection', err => {
  console.error('[UNHANDLED]', err);
  logger.error('UNHANDLED', err?.message || String(err));
});

(async () => {
  const rest = new REST({ version: '10' }).setToken(TOKEN);
  const body = [...registry.values()].map(c => c.data.toJSON());

  try {
    await rest.put(Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID), { body });
    console.log(`[COMMANDS] Registered ${body.length} slash commands`);
  } catch (err) {
    console.error('[COMMANDS ERROR]', err);
  }
})();

function loginRetry() {
  client.login(TOKEN).catch(err => {
    console.error('[LOGIN]', err.message);
    setTimeout(loginRetry, 10000);
  });
}
loginRetry();
