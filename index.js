const {
  Client,
  GatewayIntentBits,
  Partials,
  REST,
  Routes,
  ChannelType,
  EmbedBuilder  // adicione isso aqui se ainda não tiver
} = require('discord.js');
const fs = require('fs');
const path = require('path');

// Crie o client ANTES de importar commands.js
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

// Agora sim, importe e execute commands.js passando o client já criado
const { commands, handleInteraction } = require('./commands')(client);

// Config (o resto continua igual)
const TOKEN = 'MTQ2NjE2NDI0NDIyNjY0MjAxMw.G66CkW.wsBrZkq180S4cbmlR_w-iPi6EChZjfCX1Lkkcc';
const CLIENT_ID = '1466164244226642013';
const GUILD_ID = '1438264235233644546';

const tagMentions = {
  "Site": "275359225545359360",
  "Server": "395387932372107264"
};

const restartFile = path.join(__dirname, 'restart.json');

// Logs e mensagem pós-restart
client.on('ready', () => {
  console.log(`[READY] Bot online as ${client.user.tag} at ${new Date().toLocaleString('en-US')}`);

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

// Registro dos comandos
const rest = new REST({ version: '10' }).setToken(TOKEN);

(async () => {
  try {
    await rest.put(Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID), { body: commands });
    console.log('[COMMANDS] Successfully registered! Total:', commands.length);
  } catch (err) {
    console.error('[COMMANDS ERROR]', err);
  }
})();

// Handler de interações
client.on('interactionCreate', async (interaction) => {
  await handleInteraction(interaction);
});

// Forum thread creation (mantido igual)
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