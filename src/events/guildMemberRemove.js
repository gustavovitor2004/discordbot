const config = require('../../config.json');
const { safeUserText } = require('../utils/safeText');

module.exports = {
  name: 'guildMemberRemove',

  async execute(member, { logger }) {
    if (member.guild.id !== config.guildId) return;
    if (member.user?.bot) return;

    const tag = member.user?.tag ? safeUserText(member.user.tag, 64) : 'Unknown';

    logger.event('LEAVE', `${tag} left the server`, [
      { name: 'User ID', value: `${member.id}`, inline: true },
      { name: 'Member Count', value: `${member.guild.memberCount}`, inline: true }
    ]);
  }
};
