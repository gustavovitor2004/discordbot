const { SlashCommandBuilder } = require('discord.js');
const { baseEmbed, COLORS } = require('../../utils/embeds');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('help')
    .setDescription('Show list of available commands'),

  async execute(interaction, { client, registry }) {
    const groups = {
      utility: [],
      community: [],
      staff: [],
      trophi: []
    };

    for (const cmd of registry.values()) {
      const group = cmd.group || 'utility';
      if (!groups[group]) groups[group] = [];
      groups[group].push(`\`/${cmd.data.name}\` — ${cmd.data.description}`);
    }

    const embed = baseEmbed('📋 Trophi Bot Commands', COLORS.primary, interaction)
      .setDescription('Here are all available commands, grouped by category:')
      .setThumbnail(client.user.displayAvatarURL({ dynamic: true }));

    if (groups.community.length) {
      embed.addFields({ name: '🎮 Community', value: groups.community.join('\n'), inline: false });
    }
    if (groups.trophi.length) {
      embed.addFields({ name: '🏆 Trophi', value: groups.trophi.join('\n'), inline: false });
    }
    if (groups.staff.length) {
      embed.addFields({ name: '🧰 Support', value: groups.staff.join('\n'), inline: false });
    }
    if (groups.utility.length) {
      embed.addFields({ name: '🔧 Utility', value: groups.utility.join('\n'), inline: false });
    }

    await interaction.reply({ embeds: [embed] });
  }
};
