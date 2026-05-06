const cooldowns = require('../utils/cooldowns');
const { replyError } = require('../utils/embeds');

module.exports = {
  name: 'interactionCreate',

  async execute(interaction, ctx) {
    const { registry, logger } = ctx;

    if (interaction.isModalSubmit()) {
      for (const cmd of registry.values()) {
        if (typeof cmd.handleModal === 'function') {
          const handled = await cmd.handleModal(interaction, ctx).catch(err => {
            logger.error('MODAL', `Error in modal ${interaction.customId}: ${err.message}`);
            return false;
          });
          if (handled) return;
        }
      }
      return;
    }

    if (!interaction.isChatInputCommand()) return;

    const cmd = registry.get(interaction.commandName);
    if (!cmd) return;

    logger.info('CMD', `/${interaction.commandName} used by ${interaction.user.tag}`);

    if (!cmd.skipCooldown) {
      const remaining = cooldowns.check(interaction.user.id, interaction.commandName);
      if (remaining) {
        return replyError(interaction, `⏳ Please wait **${remaining}s** before using \`/${interaction.commandName}\` again.`);
      }
    }

    try {
      await cmd.execute(interaction, ctx);
    } catch (err) {
      logger.error('CMD', `Error in /${interaction.commandName}: ${err.message}`);
      console.error(err);
      await replyError(interaction, 'An unexpected error occurred. Please try again later.');
    }
  }
};
