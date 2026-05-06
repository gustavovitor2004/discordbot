const { ChannelType, EmbedBuilder } = require('discord.js');
const config = require('../../config.json');
const { COLORS } = require('../utils/embeds');

function isValidForumThread(thread) {
  const forum = thread.parent;
  if (!forum || forum.type !== ChannelType.GuildForum) return false;
  if (thread.guildId !== config.guildId) return false;
  return true;
}

module.exports = {
  name: 'threadCreate',

  async execute(thread, newlyCreated, { logger }) {
    if (!newlyCreated) return;
    if (!isValidForumThread(thread)) return;

    const forum = thread.parent;
    const appliedTags = thread.appliedTags
      .map(id => forum.availableTags.find(t => t.id === id)?.name?.trim())
      .filter(Boolean);

    logger.event('FORUM', `New thread "${thread.name}" in #${forum.name}`, [
      { name: 'Author', value: `<@${thread.ownerId}>`, inline: true },
      { name: 'Tags', value: appliedTags.join(', ') || '_none_', inline: true },
      { name: 'Link', value: `<#${thread.id}>`, inline: false }
    ]);

    const allUserIds = new Set();
    const matchedTags = [];

    for (const tag of appliedTags) {
      const value = config.tagMentions?.[tag];
      if (!value) continue;
      const userIds = Array.isArray(value) ? value : [value];
      userIds.forEach(id => allUserIds.add(id));
      matchedTags.push(tag);
    }

    if (allUserIds.size === 0) return;

    const userIds = [...allUserIds];
    const mentions = userIds.map(id => `<@${id}>`).join(' ');
    const tagList = matchedTags.map(t => `**${t}**`).join(', ');

    const embed = new EmbedBuilder()
      .setColor(COLORS.primary)
      .setTitle('🔔 New Submission Received')
      .setDescription(`Thanks <@${thread.ownerId}>! Your submission has been logged.`)
      .addFields(
        { name: 'Tags', value: tagList, inline: true },
        { name: 'Notified', value: mentions, inline: true }
      )
      .setTimestamp()
      .setFooter({ text: 'A team member will review this soon.' });

    await thread.send({
      content: mentions,
      embeds: [embed],
      allowedMentions: { users: userIds }
    }).catch(err => logger.error('FORUM', `Failed to send notification: ${err.message}`));
  }
};
