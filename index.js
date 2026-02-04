const {
  Client,
  GatewayIntentBits,
  Partials,
  REST,
  Routes,
  SlashCommandBuilder,
  EmbedBuilder,
  PermissionsBitField,
  ChannelType
} = require('discord.js');
const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');

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

// Config
const TOKEN = 'BOT TOKEN';
const CLIENT_ID = 'CLIENT ID';
const GUILD_ID = 'GUILD ID';

const tagMentions = {
  "Site": "ID PROFILE",
  "Server": "ID PROFILE"
};

const restartFile = path.join(__dirname, 'restart.json');

// Logs
client.on('ready', () => {
  console.log(`[READY] Bot online as ${client.user.tag} at ${new Date().toLocaleString('en-US')}`);

  // Check if we need to send "restarted successfully" message
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
      fs.unlinkSync(restartFile); // Clean up after sending
    } catch (err) {
      console.error('[RESTART MSG ERROR]', err);
    }
  }
});

client.on('error', err => console.error('[ERROR]', err));
client.on('warn', warn => console.warn('[WARN]', warn));

// Register commands
const commands = [
  new SlashCommandBuilder().setName('ping').setDescription('Check bot latency'),
  new SlashCommandBuilder().setName('status').setDescription('Show bot status information'),
  new SlashCommandBuilder().setName('restart').setDescription('Restart the bot (admin only)'),
  new SlashCommandBuilder().setName('help').setDescription('Show list of available commands')
].map(cmd => cmd.toJSON());

const rest = new REST({ version: '10' }).setToken(TOKEN);

(async () => {
  try {
    await rest.put(Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID), { body: commands });
    console.log('[COMMANDS] Successfully registered!');
  } catch (err) {
    console.error('[COMMANDS ERROR]', err);
  }
})();

client.on('interactionCreate', async interaction => {
  if (!interaction.isChatInputCommand()) return;

  const { commandName } = interaction;
  console.log(`[CMD] /${commandName} used by ${interaction.user.tag}`);

  const createEmbed = (title, color = 0x5865F2) => {
    return new EmbedBuilder()
      .setColor(color)
      .setTitle(title)
      .setTimestamp()
      .setFooter({ 
        text: `Requested by ${interaction.user.tag}`, 
        iconURL: interaction.user.displayAvatarURL({ dynamic: true }) 
      });
  };

  if (commandName === 'ping') {
    const embed = createEmbed('🏓 Pong!', 0x00FF00)
      .setDescription(`WebSocket latency: **${client.ws.ping}ms**`)
      .addFields({ name: 'API Latency', value: `${Date.now() - interaction.createdTimestamp}ms`, inline: true });

    await interaction.reply({ embeds: [embed] });
  }

  if (commandName === 'status') {
    const uptimeSeconds = Math.floor(process.uptime());
    const hours = Math.floor(uptimeSeconds / 3600);
    const minutes = Math.floor((uptimeSeconds % 3600) / 60);
    const seconds = uptimeSeconds % 60;
    const memory = (process.memoryUsage().rss / 1024 / 1024).toFixed(2);

    const embed = createEmbed('📊 Bot Status', 0x5865F2)
      .setThumbnail(client.user.displayAvatarURL({ dynamic: true }))
      .addFields(
        { name: '🟢 Status', value: 'Online', inline: true },
        { name: '⏰ Uptime', value: `${hours}h ${minutes}m ${seconds}s`, inline: true },
        { name: '💾 Memory', value: `${memory} MB`, inline: true },
        { name: '🌐 Latency', value: `${client.ws.ping}ms`, inline: true }
      );

    await interaction.reply({ embeds: [embed] });
  }

  if (commandName === 'restart') {
    if (!interaction.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
      const noPerm = createEmbed('❌ Access Denied', 0xFF0000)
        .setDescription('You need **Administrator** permission to use this command.');
      return interaction.reply({ embeds: [noPerm], ephemeral: true });
    }

    const restarting = createEmbed('🔄 Restarting...', 0xFFA500)
      .setDescription('The bot will restart in a few seconds.');

    await interaction.reply({ embeds: [restarting] });

    // Save channel info to send message after restart
    const restartData = {
      channelId: interaction.channelId
    };
    fs.writeFileSync(restartFile, JSON.stringify(restartData));

    setTimeout(() => {
      exec('pm2 restart discordbot', (error) => {
        if (error) console.error('[RESTART ERROR]', error);
      });
    }, 1500);
  }

  if (commandName === 'help') {
    const embed = createEmbed('📋 Bot Commands', 0x5865F2)
      .setDescription('Here are all available commands:')
      .addFields(
        { name: '/ping', value: 'Check the bot\'s latency', inline: false },
        { name: '/status', value: 'Show detailed bot status (uptime, memory, etc.)', inline: false },
        { name: '/restart', value: 'Restart the bot (Admin only)', inline: false },
        { name: '/help', value: 'Show this help message', inline: false }
      )
      .setThumbnail(client.user.displayAvatarURL({ dynamic: true }));

    await interaction.reply({ embeds: [embed] });
  }
});

// Forum thread creation
client.on('threadCreate', async (thread, newlyCreated) => {
  if (!newlyCreated) return;

  console.log(`[THREAD] New thread: ${thread.name} (ID: ${thread.id})`);

  const forum = thread.parent;
  if (!forum || forum.type !== ChannelType.GuildForum) {
    console.log('[THREAD] Not a forum channel');
    return;
  }

  const appliedTags = thread.appliedTags
    .map(id => forum.availableTags.find(t => t.id === id)?.name?.trim())
    .filter(Boolean);

  console.log(`[TAGS] Detected: ${appliedTags.join(', ') || 'none'}`);

  for (const tag of appliedTags) {
    if (tagMentions[tag]) {
      const userId = tagMentions[tag];
      console.log(`[MENTION] Tag ${tag} → <@${userId}>`);

      await thread.send({
        content: `🔔 <@${userId}> new suggestion created for **${tag}**!`,
        allowedMentions: { users: [userId] }
      }).catch(err => console.error('[SEND ERROR]', err));
    }
  }
});

// Login retry
function loginRetry() {
  client.login(TOKEN).catch(err => {
    console.error('[LOGIN]', err.message);
    setTimeout(loginRetry, 10000);
  });
}
loginRetry();
