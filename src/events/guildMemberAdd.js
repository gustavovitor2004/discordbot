const { EmbedBuilder } = require('discord.js');
const config = require('../../config.json');
const { COLORS } = require('../utils/embeds');
const { safeUserText } = require('../utils/safeText');

module.exports = {
  name: 'guildMemberAdd',

  async execute(member, { logger }) {
    if (member.guild.id !== config.guildId) return;
    if (member.user.bot) return;

    const ch = config.channels || {};
    const link = (id, fallback) => (id ? `<#${id}>` : `\`${fallback}\``);
    const tagline = config.branding?.tagline || 'Track. Master. Achieve.';

    // user.tag is shaped by Discord but display-name changes (2023+) allow
    // more characters — escape before logging to prevent markdown spoofing.
    logger.event('JOIN', `${safeUserText(member.user.tag, 64)} joined the server`, [
      { name: 'User', value: `<@${member.id}>`, inline: true },
      { name: 'Account Created', value: `<t:${Math.floor(member.user.createdTimestamp / 1000)}:R>`, inline: true },
      { name: 'Member Count', value: `${member.guild.memberCount}`, inline: true }
    ]);

    const welcomeChannelId = ch.welcome;
    if (!welcomeChannelId) return;

    const channel = await member.client.channels.fetch(welcomeChannelId).catch(() => null);
    if (!channel || !channel.isTextBased()) return;

    // Embed title is user-supplied via username — escape for safety.
    const safeName = safeUserText(member.user.username, 32) || 'friend';

    const embed = new EmbedBuilder()
      .setColor(COLORS.primary)
      .setTitle(`👋 Welcome, ${safeName}!`)
      .setDescription(
        `Welcome to **Trophi.gg — Official Server**, the home for completionists and trophy hunters.\n\n` +
        `*${tagline}* 🏆`
      )
      .setThumbnail(member.user.displayAvatarURL({ dynamic: true, size: 256 }))
      .addFields(
        {
          name: '🚀 Get Started',
          value:
            `1. Read ${link(ch.rules, '#rules')}\n` +
            `2. Pick your roles in ${link(ch.roles, '#roles')}\n` +
            `3. Say hi in ${link(ch.generalChat, '#general-chat')}!`,
          inline: false
        },
        {
          name: '💬 Need help?',
          value: `Run \`/welcome-info\` anywhere or \`/feedback\` to talk to the team.`,
          inline: false
        }
      )
      .setTimestamp()
      .setFooter({ text: `Member #${member.guild.memberCount}` });

    await channel.send({
      content: `<@${member.id}>`,
      embeds: [embed],
      // Strictly: only ping the new member, never anyone else.
      allowedMentions: { users: [member.id], parse: [] }
    }).catch(err => logger.error('WELCOME', `Failed to send welcome: ${err.message}`));
  }
};
