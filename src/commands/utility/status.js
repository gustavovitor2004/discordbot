const { SlashCommandBuilder } = require('discord.js');
const { baseEmbed, COLORS } = require('../../utils/embeds');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('status')
    .setDescription('Show bot status information'),

  async execute(interaction, { client }) {
    const uptimeSeconds = Math.floor(process.uptime());
    const hours = Math.floor(uptimeSeconds / 3600);
    const minutes = Math.floor((uptimeSeconds % 3600) / 60);
    const seconds = uptimeSeconds % 60;
    const memory = (process.memoryUsage().rss / 1024 / 1024).toFixed(2);
    const guildCount = client.guilds.cache.size;
    const userCount = client.guilds.cache.reduce((acc, g) => acc + g.memberCount, 0);

    const embed = baseEmbed('📊 Bot Status', COLORS.primary, interaction)
      .setThumbnail(client.user.displayAvatarURL({ dynamic: true }))
      .addFields(
        { name: '🟢 Status', value: 'Online', inline: true },
        { name: '⏰ Uptime', value: `${hours}h ${minutes}m ${seconds}s`, inline: true },
        { name: '💾 Memory', value: `${memory} MB`, inline: true },
        { name: '🌐 Latency', value: `${client.ws.ping}ms`, inline: true },
        { name: '🏠 Servers', value: `${guildCount}`, inline: true },
        { name: '👥 Users', value: `${userCount}`, inline: true },
        { name: '🟨 Node.js', value: process.version, inline: true },
        { name: '📦 Discord.js', value: `v${require('discord.js').version}`, inline: true }
      );

    await interaction.reply({ embeds: [embed] });
  }
};
