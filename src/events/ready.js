const fs = require('fs/promises');
const path = require('path');
const { EmbedBuilder } = require('discord.js');
const { COLORS } = require('../utils/embeds');

const restartFile = path.join(__dirname, '..', '..', 'restart.json');

module.exports = {
  name: 'ready',
  once: true,

  async execute(client, { logger }) {
    console.log(`[READY] Bot online as ${client.user.tag} at ${new Date().toLocaleString('en-US')}`);

    client.user.setPresence({
      activities: [{ name: 'trophi.gg | /help', type: 3 }],
      status: 'online'
    });

    logger.success('STARTUP', `Bot online as ${client.user.tag}`);

    // Send post-restart confirmation if a restart marker exists.
    try {
      const raw = await fs.readFile(restartFile, 'utf8');
      const data = JSON.parse(raw);
      const channel = client.channels.cache.get(data.channelId);
      if (channel) {
        const embed = new EmbedBuilder()
          .setColor(COLORS.success)
          .setTitle('✅ Bot Restarted Successfully!')
          .setDescription('The bot is back online and ready.')
          .setTimestamp()
          .setFooter({ text: 'Trophi.gg' });
        await channel.send({ embeds: [embed] }).catch(() => {});
      }
      await fs.unlink(restartFile).catch(() => {});
    } catch (err) {
      // No marker file (most common case) or invalid JSON — silent skip.
      if (err.code !== 'ENOENT') {
        logger.warn('STARTUP', `Could not process restart marker: ${err.message}`);
      }
    }
  }
};
