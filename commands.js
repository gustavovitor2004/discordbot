const { SlashCommandBuilder, EmbedBuilder, PermissionsBitField } = require('discord.js');
const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');
const config = require('./config.json');

const restartFile = path.join(__dirname, 'restart.json');

// Cooldown manager
const cooldowns = new Map();

function checkCooldown(userId, commandName) {
  const key = `${userId}-${commandName}`;
  const cooldownSeconds = config.cooldowns[commandName] ?? 3;
  const now = Date.now();

  if (cooldowns.has(key)) {
    const expiresAt = cooldowns.get(key);
    if (now < expiresAt) {
      const remaining = ((expiresAt - now) / 1000).toFixed(1);
      return remaining;
    }
  }

  cooldowns.set(key, now + cooldownSeconds * 1000);
  return null;
}

module.exports = (client) => {
  // Helper to create embeds
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

  // Helper for error replies
  const replyError = async (interaction, description) => {
    const embed = createEmbed('❌ Error', 0xFF0000, interaction)
      .setDescription(description);
    if (interaction.replied || interaction.deferred) {
      await interaction.followUp({ embeds: [embed], ephemeral: true }).catch(console.error);
    } else {
      await interaction.reply({ embeds: [embed], ephemeral: true }).catch(console.error);
    }
  };

  // Register slash commands
  const commands = [
    new SlashCommandBuilder().setName('ping').setDescription('Check bot latency'),
    new SlashCommandBuilder().setName('status').setDescription('Show bot status information'),
    new SlashCommandBuilder().setName('restart').setDescription('Restart the bot (admin only)'),
    new SlashCommandBuilder().setName('help').setDescription('Show list of available commands'),
    new SlashCommandBuilder().setName('tags').setDescription('Show configured forum tags and their mentions')
  ].map(cmd => cmd.toJSON());

  // Interaction handler
  const handleInteraction = async (interaction) => {
    if (!interaction.isChatInputCommand()) return;

    const { commandName } = interaction;
    console.log(`[CMD] /${commandName} used by ${interaction.user.tag}`);

    // Cooldown check (skip for admin-only restart)
    if (commandName !== 'restart') {
      const remaining = checkCooldown(interaction.user.id, commandName);
      if (remaining) {
        return replyError(interaction, `⏳ Please wait **${remaining}s** before using \`/${commandName}\` again.`);
      }
    }

    try {
      switch (commandName) {
        case 'ping': {
          const embed = createEmbed('🏓 Pong!', 0x00FF00, interaction)
            .setDescription(`WebSocket latency: **${client.ws.ping}ms**`)
            .addFields({ name: 'API Latency', value: `${Date.now() - interaction.createdTimestamp}ms`, inline: true });

          await interaction.reply({ embeds: [embed] });
          break;
        }

        case 'status': {
          const uptimeSeconds = Math.floor(process.uptime());
          const hours = Math.floor(uptimeSeconds / 3600);
          const minutes = Math.floor((uptimeSeconds % 3600) / 60);
          const seconds = uptimeSeconds % 60;
          const memory = (process.memoryUsage().rss / 1024 / 1024).toFixed(2);
          const nodeVersion = process.version;
          const djsVersion = require('discord.js').version;
          const guildCount = client.guilds.cache.size;
          const userCount = client.guilds.cache.reduce((acc, g) => acc + g.memberCount, 0);

          const embed = createEmbed('📊 Bot Status', 0x5865F2, interaction)
            .setThumbnail(client.user.displayAvatarURL({ dynamic: true }))
            .addFields(
              { name: '🟢 Status', value: 'Online', inline: true },
              { name: '⏰ Uptime', value: `${hours}h ${minutes}m ${seconds}s`, inline: true },
              { name: '💾 Memory', value: `${memory} MB`, inline: true },
              { name: '🌐 Latency', value: `${client.ws.ping}ms`, inline: true },
              { name: '🏠 Servers', value: `${guildCount}`, inline: true },
              { name: '👥 Users', value: `${userCount}`, inline: true },
              { name: '🟨 Node.js', value: nodeVersion, inline: true },
              { name: '📦 Discord.js', value: `v${djsVersion}`, inline: true }
            );

          await interaction.reply({ embeds: [embed] });
          break;
        }

        case 'restart': {
          if (!interaction.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
            return replyError(interaction, 'You need **Administrator** permission to use this command.');
          }

          const restarting = createEmbed('🔄 Restarting...', 0xFFA500, interaction)
            .setDescription('The bot will restart in a few seconds.');

          await interaction.reply({ embeds: [restarting] });

          // Save channel for post-restart message
          const restartData = { channelId: interaction.channelId };
          fs.writeFileSync(restartFile, JSON.stringify(restartData));

          setTimeout(() => {
            exec('pm2 restart discordbot', (error) => {
              if (error) {
                console.error('[RESTART ERROR]', error);
                const channel = client.channels.cache.get(interaction.channelId);
                if (channel) {
                  const failEmbed = new EmbedBuilder()
                    .setColor(0xFF0000)
                    .setTitle('❌ Restart Failed')
                    .setDescription(`An error occurred while restarting:\n\`\`\`${error.message}\`\`\``)
                    .setTimestamp();
                  channel.send({ embeds: [failEmbed] }).catch(console.error);
                }
              }
            });
          }, 1500);
          break;
        }

        case 'help': {
          const embed = createEmbed('📋 Bot Commands', 0x5865F2, interaction)
            .setDescription('Here are all available commands:')
            .addFields(
              { name: '/ping', value: 'Check the bot\'s latency', inline: false },
              { name: '/status', value: 'Show detailed bot status (uptime, memory, servers, etc.)', inline: false },
              { name: '/restart', value: 'Restart the bot *(Admin only)*', inline: false },
              { name: '/tags', value: 'Show configured forum tags and their mentions', inline: false },
              { name: '/help', value: 'Show this help message', inline: false }
            )
            .setThumbnail(client.user.displayAvatarURL({ dynamic: true }));

          await interaction.reply({ embeds: [embed] });
          break;
        }

        case 'tags': {
          const tagList = Object.entries(config.tagMentions)
            .map(([tag, userId]) => `• **${tag}** → <@${userId}>`)
            .join('\n');

          const embed = createEmbed('🏷️ Configured Tags', 0x5865F2, interaction)
            .setDescription('These forum tags trigger automatic mentions:\n\n' + tagList);

          await interaction.reply({ embeds: [embed] });
          break;
        }

        default:
          await replyError(interaction, 'Unknown command.');
      }
    } catch (err) {
      console.error(`[CMD ERROR] /${commandName}:`, err);
      await replyError(interaction, 'An unexpected error occurred. Please try again later.');
    }
  };

  return { commands, handleInteraction };
};