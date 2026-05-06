const { SlashCommandBuilder, PermissionFlagsBits, MessageFlags } = require('discord.js');
const { baseEmbed, COLORS } = require('../../utils/embeds');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('status')
    .setDescription('Show bot status'),

  async execute(interaction, { client }) {
    const isAdmin = interaction.inGuild() &&
      interaction.member?.permissions?.has(PermissionFlagsBits.Administrator);

    const uptimeSeconds = Math.floor(process.uptime());
    const hours = Math.floor(uptimeSeconds / 3600);
    const minutes = Math.floor((uptimeSeconds % 3600) / 60);
    const seconds = uptimeSeconds % 60;

    const embed = baseEmbed('📊 Bot Status', COLORS.primary, interaction)
      .setThumbnail(client.user.displayAvatarURL({ dynamic: true }))
      .addFields(
        { name: '🟢 Status', value: 'Online', inline: true },
        { name: '⏰ Uptime', value: `${hours}h ${minutes}m ${seconds}s`, inline: true },
        { name: '🌐 Latency', value: `${client.ws.ping}ms`, inline: true }
      );

    // Admin-only: infrastructure details that could aid an attacker
    // (memory pressure, runtime versions for CVE targeting).
    if (isAdmin) {
      const memory = (process.memoryUsage().rss / 1024 / 1024).toFixed(2);
      const guildCount = client.guilds.cache.size;
      const userCount = client.guilds.cache.reduce((acc, g) => acc + g.memberCount, 0);

      embed.addFields(
        { name: '💾 Memory', value: `${memory} MB`, inline: true },
        { name: '🏠 Servers', value: `${guildCount}`, inline: true },
        { name: '👥 Users', value: `${userCount}`, inline: true },
        { name: '🟨 Node.js', value: process.version, inline: true },
        { name: '📦 Discord.js', value: `v${require('discord.js').version}`, inline: true }
      );
    }

    // Always ephemeral — keeps health checks out of the public chat history.
    await interaction.reply({
      embeds: [embed],
      flags: MessageFlags.Ephemeral
    });
  }
};
