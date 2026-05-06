const { SlashCommandBuilder } = require('discord.js');
const { baseEmbed, COLORS } = require('../../utils/embeds');
const config = require('../../../config.json');

module.exports = {
  group: 'community',

  data: new SlashCommandBuilder()
    .setName('welcome-info')
    .setDescription('Show a quick overview of the Trophi.gg server'),

  async execute(interaction) {
    const ch = config.channels || {};
    const tagline = config.branding?.tagline || 'Track. Master. Achieve.';
    const siteUrl = config.branding?.siteUrl || 'https://trophi.gg';

    const link = (id, fallback) => (id ? `<#${id}>` : `\`${fallback}\``);

    const embed = baseEmbed('🏆 Welcome to Trophi.gg', COLORS.primary, interaction)
      .setDescription(
        `The home for **completionists, trophy hunters, and players who love mastering their games.**\n\n` +
        `*${tagline}*`
      )
      .addFields(
        {
          name: '🧭 Start Here',
          value:
            `• ${link(ch.rules, '#rules')} — Read the server rules\n` +
            `• ${link(ch.roles, '#roles')} — Pick your player roles\n` +
            `• ${link(ch.generalChat, '#general-chat')} — Say hi!`,
          inline: false
        },
        {
          name: '🎮 Show Your Mastery',
          value: `${link(ch.showAchievements, '#show-your-achievements')} — Post your trophy pops, 100% runs, and proudest moments.`,
          inline: false
        },
        {
          name: '💬 Got feedback or a bug?',
          value: `Use \`/feedback\` to send it directly to the Trophi team.`,
          inline: false
        },
        {
          name: '🌐 Trophi.gg',
          value: `[Visit the site](${siteUrl})`,
          inline: false
        }
      );

    await interaction.reply({ embeds: [embed] });
  }
};
