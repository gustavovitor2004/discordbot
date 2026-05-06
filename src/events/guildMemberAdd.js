const { EmbedBuilder } = require('discord.js');
const config = require('../../config.json');
const { COLORS } = require('../utils/embeds');

module.exports = {
  name: 'guildMemberAdd',

  async execute(member, { logger }) {
    if (member.guild.id !== config.guildId) return;
    if (member.user.bot) return;

    const ch = config.channels || {};
    const link = (id, fallback) => (id ? `<#${id}>` : `\`${fallback}\``);
    const tagline = config.branding?.tagline || 'Track. Master. Achieve.';

    logger.event('JOIN', `${member.user.tag} joined the server`, [
      { name: 'User', value: `<@${member.id}>`, inline: true },
      { name: 'Account Created', value: `<t:${Math.floor(member.user.createdTimestamp / 1000)}:R>`, inline: true },
      { name: 'Member Count', value: `${member.guild.memberCount}`, inline: true }
    ]);

    const welcomeChannelId = ch.welcome;
    if (!welcomeChannelId) return;

    const channel = await member.client.channels.fetch(welcomeChannelId).catch(() => null);
    if (!channel || !channel.isTextBased()) return;

    const embed = new EmbedBuilder()
      .setColor(COLORS.primary)
      .setTitle(`👋 Welcome, ${member.user.username}!`)
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
      allowedMentions: { users: [member.id] }
    }).catch(err => console.error('[WELCOME ERROR]', err));
  }
};
