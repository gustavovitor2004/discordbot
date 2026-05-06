const config = require('../../config.json');

module.exports = {
  name: 'guildMemberRemove',

  async execute(member, { logger }) {
    if (member.guild.id !== config.guildId) return;
    if (member.user?.bot) return;

    logger.event('LEAVE', `${member.user?.tag || 'Unknown'} left the server`, [
      { name: 'User ID', value: `${member.id}`, inline: true },
      { name: 'Member Count', value: `${member.guild.memberCount}`, inline: true }
    ]);
  }
};
