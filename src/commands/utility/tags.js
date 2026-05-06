const { SlashCommandBuilder } = require('discord.js');
const { baseEmbed, COLORS } = require('../../utils/embeds');
const config = require('../../../config.json');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('tags')
    .setDescription('Show configured forum tags and their mentions'),

  async execute(interaction) {
    const entries = Object.entries(config.tagMentions || {});

    if (entries.length === 0) {
      const embed = baseEmbed('🏷️ Configured Tags', COLORS.warning, interaction)
        .setDescription('_No tags configured yet._');
      return interaction.reply({ embeds: [embed], ephemeral: true });
    }

    const lines = entries.map(([tag, value]) => {
      const userIds = Array.isArray(value) ? value : [value];
      const mentions = userIds.map(id => `<@${id}>`).join(' ');
      return `• **${tag}** → ${mentions}`;
    });

    const embed = baseEmbed('🏷️ Configured Tags', COLORS.primary, interaction)
      .setDescription('These forum tags trigger automatic mentions:\n\n' + lines.join('\n'));

    await interaction.reply({ embeds: [embed] });
  }
};
