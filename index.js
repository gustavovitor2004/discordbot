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

// --- Startup validation -----------------------------------------------------
const TOKEN = process.env.DISCORD_TOKEN;
const CLIENT_ID = config.clientId;
const GUILD_ID = config.guildId;

function fail(msg) {
  console.error(`[FATAL] ${msg}`);
  process.exit(1);
}

if (!TOKEN) fail('DISCORD_TOKEN is not set in .env file.');
if (!/^\d{17,20}$/.test(CLIENT_ID || '')) fail('config.clientId is missing or invalid (expected a Discord snowflake).');
if (!/^\d{17,20}$/.test(GUILD_ID || '')) fail('config.guildId is missing or invalid (expected a Discord snowflake).');

// --- Client -----------------------------------------------------------------
// Principle of least privilege: only request intents we actually use.
// (MessageContent and GuildMessages are NOT used by current commands/events.)
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers
  ],
  partials: [Partials.Channel, Partials.GuildMember]
});

logger.init(client);

// --- Auto-load commands & events --------------------------------------------
const registry = loadCommands(path.join(__dirname, 'src', 'commands'));
const ctx = { client, config, logger, registry };

loadEvents(client, path.join(__dirname, 'src', 'events'), ctx);

// --- Global error safety net ------------------------------------------------
client.on('error', err => logger.error('CLIENT', err?.message || String(err)));
client.on('warn', warn => logger.warn('CLIENT', warn));

process.on('unhandledRejection', err => {
  console.error('[UNHANDLED REJECTION]', err);
  logger.error('UNHANDLED', err?.message || String(err));
});

process.on('uncaughtException', err => {
  console.error('[UNCAUGHT EXCEPTION]', err);
  logger.error('UNCAUGHT', err?.message || String(err));
  // Stay alive — PM2 / supervisor will decide if a restart is warranted.
});

process.on('SIGTERM', () => {
  console.log('[SHUTDOWN] SIGTERM received, closing client...');
  client.destroy().finally(() => process.exit(0));
});
process.on('SIGINT', () => {
  console.log('[SHUTDOWN] SIGINT received, closing client...');
  client.destroy().finally(() => process.exit(0));
});

// --- Register slash commands (guild-scoped) ---------------------------------
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

// --- Login with capped exponential backoff ----------------------------------
let loginAttempt = 0;
const LOGIN_BACKOFF_CAP = 5 * 60 * 1000; // 5 min

function loginRetry() {
  client.login(TOKEN).catch(err => {
    loginAttempt++;
    const delay = Math.min(1000 * 2 ** loginAttempt, LOGIN_BACKOFF_CAP);
    console.error(`[LOGIN] attempt ${loginAttempt} failed: ${err.message} — retrying in ${Math.round(delay / 1000)}s`);
    setTimeout(loginRetry, delay);
  });
}
loginRetry();
