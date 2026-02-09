const { SlashCommandBuilder, EmbedBuilder, PermissionsBitField } = require('discord.js');
const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');

const restartFile = path.join(__dirname, 'restart.json');

module.exports = (client) => {
  // Função auxiliar para criar embeds bonitos
  const createEmbed = (title, color = 0x5865F2, interaction) => {
    return new EmbedBuilder()
      .setColor(color)
      .setTitle(title)
      .setTimestamp()
      .setFooter({ 
        text: `Requested by ${interaction.user.tag}`, 
        iconURL: interaction.user.displayAvatarURL({ dynamic: true }) 
      });
  };

  // Registro dos comandos (exporta a lista para index.js registrar)
  const commands = [
    new SlashCommandBuilder().setName('ping').setDescription('Check bot latency'),
    new SlashCommandBuilder().setName('status').setDescription('Show bot status information'),
    new SlashCommandBuilder().setName('restart').setDescription('Restart the bot (admin only)'),
    new SlashCommandBuilder().setName('help').setDescription('Show list of available commands')
  ].map(cmd => cmd.toJSON());

  // Handler de interação (exporta a função para index.js usar)
  const handleInteraction = async (interaction) => {
    if (!interaction.isChatInputCommand()) return;

    const { commandName } = interaction;
    console.log(`[CMD] /${commandName} used by ${interaction.user.tag}`);

    if (commandName === 'ping') {
      const embed = createEmbed('🏓 Pong!', 0x00FF00, interaction)
        .setDescription(`WebSocket latency: **${client.ws.ping}ms**`)
        .addFields({ name: 'API Latency', value: `${Date.now() - interaction.createdTimestamp}ms`, inline: true });

      await interaction.reply({ embeds: [embed] });
    }

    if (commandName === 'status') {
      const uptimeSeconds = Math.floor(process.uptime());
      const hours = Math.floor(uptimeSeconds / 3600);
      const minutes = Math.floor((uptimeSeconds % 3600) / 60);
      const seconds = uptimeSeconds % 60;
      const memory = (process.memoryUsage().rss / 1024 / 1024).toFixed(2);

      const embed = createEmbed('📊 Bot Status', 0x5865F2, interaction)
        .setThumbnail(client.user.displayAvatarURL({ dynamic: true }))
        .addFields(
          { name: '🟢 Status', value: 'Online', inline: true },
          { name: '⏰ Uptime', value: `${hours}h ${minutes}m ${seconds}s`, inline: true },
          { name: '💾 Memory', value: `${memory} MB`, inline: true },
          { name: '🌐 Latency', value: `${client.ws.ping}ms`, inline: true }
        );

      await interaction.reply({ embeds: [embed] });
    }

    if (commandName === 'restart') {
      if (!interaction.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
        const noPerm = createEmbed('❌ Access Denied', 0xFF0000, interaction)
          .setDescription('You need **Administrator** permission to use this command.');
        return interaction.reply({ embeds: [noPerm], ephemeral: true });
      }

      const restarting = createEmbed('🔄 Restarting...', 0xFFA500, interaction)
        .setDescription('The bot will restart in a few seconds.');

      await interaction.reply({ embeds: [restarting] });

      // Salva o canal para mensagem pós-restart
      const restartData = { channelId: interaction.channelId };
      fs.writeFileSync(restartFile, JSON.stringify(restartData));

      setTimeout(() => {
        exec('pm2 restart discordbot', (error) => {
          if (error) console.error('[RESTART ERROR]', error);
        });
      }, 1500);
    }

    if (commandName === 'help') {
      const embed = createEmbed('📋 Bot Commands', 0x5865F2, interaction)
        .setDescription('Here are all available commands:')
        .addFields(
          { name: '/ping', value: 'Check the bot\'s latency', inline: false },
          { name: '/status', value: 'Show detailed bot status (uptime, memory, etc.)', inline: false },
          { name: '/restart', value: 'Restart the bot (Admin only)', inline: false },
          { name: '/help', value: 'Show this help message', inline: false }
        )
        .setThumbnail(client.user.displayAvatarURL({ dynamic: true }));

      await interaction.reply({ embeds: [embed] });
    }
  };

  return { commands, handleInteraction };
};