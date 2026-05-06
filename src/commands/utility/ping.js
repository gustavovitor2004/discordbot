const { SlashCommandBuilder } = require('discord.js');
const { baseEmbed, COLORS } = require('../../utils/embeds');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('ping')
    .setDescription('Check bot latency'),

  async execute(interaction, { client }) {
    const embed = baseEmbed('🏓 Pong!', COLORS.success, interaction)
      .setDescription(`WebSocket latency: **${client.ws.ping}ms**`)
      .addFields({
        name: 'API Latency',
        value: `${Date.now() - interaction.createdTimestamp}ms`,
        inline: true
      });

    await interaction.reply({ embeds: [embed] });
  }
};
