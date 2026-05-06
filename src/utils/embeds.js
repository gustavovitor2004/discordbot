const { EmbedBuilder } = require('discord.js');
const config = require('../../config.json');

const COLORS = {
  primary: config.branding?.primaryColor ?? 0x5865F2,
  success: config.branding?.successColor ?? 0x00FF00,
  error: config.branding?.errorColor ?? 0xFF0000,
  warning: config.branding?.warningColor ?? 0xFFA500
};

function baseEmbed(title, color = COLORS.primary, interaction) {
  const embed = new EmbedBuilder()
    .setColor(color)
    .setTitle(title)
    .setTimestamp();

  if (interaction?.user) {
    embed.setFooter({
      text: `Requested by ${interaction.user.tag}`,
      iconURL: interaction.user.displayAvatarURL({ dynamic: true })
    });
  } else {
    embed.setFooter({ text: 'Trophi.gg' });
  }

  return embed;
}

function successEmbed(title, interaction) {
  return baseEmbed(`✅ ${title}`, COLORS.success, interaction);
}

function errorEmbed(title, interaction) {
  return baseEmbed(`❌ ${title}`, COLORS.error, interaction);
}

function warningEmbed(title, interaction) {
  return baseEmbed(`⚠️ ${title}`, COLORS.warning, interaction);
}

async function replyError(interaction, description) {
  const embed = errorEmbed('Error', interaction).setDescription(description);
  const payload = { embeds: [embed], ephemeral: true };

  if (interaction.replied || interaction.deferred) {
    return interaction.followUp(payload).catch(console.error);
  }
  return interaction.reply(payload).catch(console.error);
}

module.exports = {
  COLORS,
  baseEmbed,
  successEmbed,
  errorEmbed,
  warningEmbed,
  replyError
};
