const { ChannelType, EmbedBuilder } = require('discord.js');
const config = require('../../config.json');
const { COLORS } = require('../utils/embeds');
const { safeUserText } = require('../utils/safeText');

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

    // Thread name and forum name are user-controlled — escape before logging
    // to prevent markdown link injection / phishing in #auto-log.
    logger.event('FORUM', `New thread "${safeUserText(thread.name, 200)}" in #${safeUserText(forum.name, 100)}`, [
      { name: 'Author', value: `<@${thread.ownerId}>`, inline: true },
      { name: 'Tags', value: appliedTags.map(t => safeUserText(t, 50)).join(', ') || '_none_', inline: true },
      { name: 'Link', value: `<#${thread.id}>`, inline: false }
    ]);

    const allUserIds = new Set();
    const matchedTags = [];

    for (const tag of appliedTags) {
      const value = config.tagMentions?.[tag];
      if (!value) continue;
      const userIds = Array.isArray(value) ? value : [value];
      // Validate user IDs are snowflakes — reject any malformed config entry.
      for (const id of userIds) {
        if (/^\d{17,20}$/.test(id)) allUserIds.add(id);
      }
      matchedTags.push(tag);
    }

    if (allUserIds.size === 0) return;

    const userIds = [...allUserIds];
    const mentions = userIds.map(id => `<@${id}>`).join(' ');
    const tagList = matchedTags.map(t => `**${safeUserText(t, 50)}**`).join(', ');

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
      // Strict allowlist: only the configured staff IDs can be pinged here.
      allowedMentions: { users: userIds, parse: [] }
    }).catch(err => logger.error('FORUM', `Failed to send notification: ${err.message}`));
  }
};
