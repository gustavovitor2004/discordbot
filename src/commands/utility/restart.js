const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const { exec } = require('child_process');
const fs = require('fs');
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
    if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
      return replyError(interaction, 'You need **Administrator** permission to use this command.');
    }

    const embed = baseEmbed('🔄 Restarting...', COLORS.warning, interaction)
      .setDescription('The bot will restart in a few seconds.');

    await interaction.reply({ embeds: [embed] });

    fs.writeFileSync(restartFile, JSON.stringify({ channelId: interaction.channelId }));

    logger.warn('RESTART', `Restart triggered by ${interaction.user.tag}`);

    setTimeout(() => {
      exec('pm2 restart discordbot', (error) => {
        if (!error) return;
        console.error('[RESTART ERROR]', error);
        const channel = client.channels.cache.get(interaction.channelId);
        if (!channel) return;
        const failEmbed = new EmbedBuilder()
          .setColor(COLORS.error)
          .setTitle('❌ Restart Failed')
          .setDescription(`\`\`\`${error.message}\`\`\``)
          .setTimestamp();
        channel.send({ embeds: [failEmbed] }).catch(console.error);
      });
    }, 1500);
  }
};
