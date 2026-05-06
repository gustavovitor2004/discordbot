const cooldowns = require('../utils/cooldowns');
const { replyError } = require('../utils/embeds');
const { safeErrorMessage, safeUserText } = require('../utils/safeText');
const config = require('../../config.json');

module.exports = {
  name: 'interactionCreate',

  async execute(interaction, ctx) {
    const { registry, logger } = ctx;

    // Defense-in-depth: bot is single-guild scoped, refuse interactions from elsewhere.
    if (interaction.guildId && interaction.guildId !== config.guildId) {
      logger.warn('SECURITY', `Interaction from foreign guild ${interaction.guildId} blocked`);
      return;
    }

    // --- Modal submissions ---------------------------------------------------
    if (interaction.isModalSubmit()) {
      const handler = ctx.modalHandlers?.find(interaction.customId);
      if (!handler) return;
      try {
        await handler(interaction, ctx);
      } catch (err) {
        logger.error('MODAL', `Error in modal ${safeUserText(interaction.customId, 100)}: ${safeErrorMessage(err)}`);
        console.error(err); // full stack only to local console, never to Discord channel
        await replyError(interaction, 'Something went wrong submitting your form. Please try again.');
      }
      return;
    }

    // --- Slash commands ------------------------------------------------------
    if (!interaction.isChatInputCommand()) return;

    const cmd = registry.get(interaction.commandName);
    if (!cmd) return;

    if (!cmd.skipCooldown) {
      const remaining = cooldowns.check(interaction.user.id, interaction.commandName);
      if (remaining) {
        return replyError(interaction, `⏳ Please wait **${remaining}s** before using \`/${interaction.commandName}\` again.`);
      }
    }

    logger.info('CMD', `/${interaction.commandName} used by ${safeUserText(interaction.user.tag, 64)}`);

    try {
      await cmd.execute(interaction, ctx);
    } catch (err) {
      logger.error('CMD', `Error in /${interaction.commandName}: ${safeErrorMessage(err)}`);
      console.error(err);
      await replyError(interaction, 'An unexpected error occurred. Please try again later.');
    }
  }
};
