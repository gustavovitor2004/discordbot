require('dotenv').config();
const {
  Client,
  GatewayIntentBits,
  Partials,
  REST,
  Routes,
  ChannelType,
  EmbedBuilder
} = require('discord.js');
const fs = require('fs');
const path = require('path');
const config = require('./config.json');

// Create client
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers
  ],
  partials: [
    Partials.Channel,
    Partials.Message,
    Partials.ThreadMember
  ]
});

// Load commands module
const { commands, handleInteraction } = require('./commands')(client);

// Token from .env
const TOKEN = process.env.DISCORD_TOKEN;
const CLIENT_ID = config.clientId;
const GUILD_ID = config.guildId;

const restartFile = path.join(__dirname, 'restart.json');

// Validate forum channel (only react to the correct guild)
function isValidForumThread(thread) {
  const forum = thread.parent;
  if (!forum || forum.type !== ChannelType.GuildForum) return false;
  if (thread.guildId !== GUILD_ID) return false;
  return true;
}

// Ready event
client.on('ready', () => {
  console.log(`[READY] Bot online as ${client.user.tag} at ${new Date().toLocaleString('en-US')}`);

  // Post-restart message
  if (fs.existsSync(restartFile)) {
    try {
      const data = JSON.parse(fs.readFileSync(restartFile, 'utf8'));
      const channel = client.channels.cache.get(data.channelId);
      if (channel) {
        const embed = new EmbedBuilder()
          .setColor(0x00FF00)
          .setTitle('✅ Bot Restarted Successfully!')
          .setDescription('The bot is back online and ready.')
          .setTimestamp()
          .setFooter({ text: 'Discord Bot' });

        channel.send({ embeds: [embed] }).catch(console.error);
      }
      fs.unlinkSync(restartFile);
    } catch (err) {
      console.error('[RESTART MSG ERROR]', err);
    }
  }
});

client.on('error', err => console.error('[ERROR]', err));
client.on('warn', warn => console.warn('[WARN]', warn));

// Register slash commands
const rest = new REST({ version: '10' }).setToken(TOKEN);

(async () => {
  try {
    await rest.put(Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID), { body: commands });
    console.log('[COMMANDS] Successfully registered! Total:', commands.length);
  } catch (err) {
    console.error('[COMMANDS ERROR]', err);
  }
})();

// Interaction handler
client.on('interactionCreate', async (interaction) => {
  await handleInteraction(interaction);
});

// Forum thread creation
client.on('threadCreate', async (thread, newlyCreated) => {
  if (!newlyCreated) return;

  console.log(`[THREAD] New thread: ${thread.name} (ID: ${thread.id})`);

  // Validate: only react to the correct guild's forum channels
  if (!isValidForumThread(thread)) {
    console.log('[THREAD] Skipped — not a valid forum thread for this guild');
    return;
  }

  const forum = thread.parent;
  const appliedTags = thread.appliedTags
    .map(id => forum.availableTags.find(t => t.id === id)?.name?.trim())
    .filter(Boolean);

  console.log(`[TAGS] Detected: ${appliedTags.join(', ') || 'none'}`);

  for (const tag of appliedTags) {
    if (config.tagMentions[tag]) {
      const userId = config.tagMentions[tag];
      console.log(`[MENTION] Tag "${tag}" → <@${userId}>`);

      await thread.send({
        content: `🔔 <@${userId}> new suggestion created for **${tag}**!`,
        allowedMentions: { users: [userId] }
      }).catch(err => console.error('[SEND ERROR]', err));
    }
  }
});

// Login with retry
function loginRetry() {
  if (!TOKEN) {
    console.error('[LOGIN] DISCORD_TOKEN is not set in .env file!');
    process.exit(1);
  }

  client.login(TOKEN).catch(err => {
    console.error('[LOGIN]', err.message);
    setTimeout(loginRetry, 10000);
  });
}
loginRetry();