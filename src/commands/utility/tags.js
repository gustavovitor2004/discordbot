const { SlashCommandBuilder, PermissionFlagsBits, MessageFlags } = require('discord.js');
const { baseEmbed, COLORS, replyError } = require('../../utils/embeds');
const config = require('../../../config.json');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('tags')
    .setDescription('Show configured forum tags and their mentions (admin only)')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),

  async execute(interaction) {
    // Runtime re-check — UI permissions can be overridden by server admins.
    if (!interaction.inGuild() || !interaction.member?.permissions?.has(PermissionFlagsBits.ManageGuild)) {
      return replyError(interaction, 'You need **Manage Server** permission to view this.');
    }

    const entries = Object.entries(config.tagMentions || {});

    if (entries.length === 0) {
      const embed = baseEmbed('🏷️ Configured Tags', COLORS.warning, interaction)
        .setDescription('_No tags configured yet._');
      return interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
    }

    const lines = entries.map(([tag, value]) => {
      const userIds = Array.isArray(value) ? value : [value];
      const mentions = userIds.map(id => `<@${id}>`).join(' ');
      return `• **${tag}** → ${mentions}`;
    });

    const embed = baseEmbed('🏷️ Configured Tags', COLORS.primary, interaction)
      .setDescription('These forum tags trigger automatic mentions:\n\n' + lines.join('\n'));

    // Always ephemeral — never disclose mod IDs to the channel.
    await interaction.reply({
      embeds: [embed],
      flags: MessageFlags.Ephemeral,
      allowedMentions: { parse: [] }
    });
  }
};
