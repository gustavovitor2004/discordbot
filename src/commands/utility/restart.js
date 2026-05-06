const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const { spawn } = require('child_process');
const fs = require('fs/promises');
const path = require('path');
const { baseEmbed, COLORS, replyError } = require('../../utils/embeds');

const restartFile = path.join(__dirname, '..', '..', '..', 'restart.json');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('restart')
    .setDescription('Restart the bot (admin only)')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  skipCooldown: true,

  async execute(interaction, { client, logger }) {
    // Re-check at runtime even though we set default permissions —
    // setDefaultMemberPermissions is a UI hint, server admins can override.
    if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
      return replyError(interaction, 'You need **Administrator** permission to use this command.');
    }

    const embed = baseEmbed('🔄 Restarting...', COLORS.warning, interaction)
      .setDescription('The bot will restart in a few seconds.');

    await interaction.reply({ embeds: [embed] });

    try {
      await fs.writeFile(restartFile, JSON.stringify({ channelId: interaction.channelId }));
    } catch (err) {
      logger.warn('RESTART', `Could not write restart marker: ${err.message}`);
    }

    logger.warn('RESTART', `Restart triggered by ${interaction.user.tag}`);

    setTimeout(() => {
      // Use spawn with detached + arg array — no shell interpolation,
      // hardened against any future config injection vectors.
      const child = spawn('pm2', ['restart', 'discordbot'], {
        detached: true,
        stdio: 'ignore',
        shell: false,
        windowsHide: true
      });

      child.on('error', err => {
        logger.error('RESTART', `Failed to spawn pm2: ${err.message}`);
        const channel = client.channels.cache.get(interaction.channelId);
        if (!channel) return;
        const failEmbed = new EmbedBuilder()
          .setColor(COLORS.error)
          .setTitle('❌ Restart Failed')
          .setDescription(`PM2 not available on PATH or failed to start:\n\`\`\`${err.message}\`\`\``)
          .setTimestamp();
        channel.send({ embeds: [failEmbed] }).catch(() => {});
      });

      child.unref();
    }, 1500);
  }
};
