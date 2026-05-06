const {
  SlashCommandBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ActionRowBuilder,
  MessageFlags
} = require('discord.js');
const { baseEmbed, successEmbed, replyError, COLORS } = require('../../utils/embeds');
const config = require('../../../config.json');

const TYPES = {
  bug:     { label: '🐛 Bug Report',       color: 0xFF6B6B },
  feature: { label: '💡 Feature Request',  color: 0x4ECDC4 },
  general: { label: '💬 General Feedback', color: 0x5865F2 }
};

const MAX_TITLE = 100;
const MAX_DESCRIPTION = 2000;
const MAX_CONTEXT = 200;

function sanitize(value, max) {
  return (value ?? '').toString().trim().slice(0, max);
}

module.exports = {
  group: 'staff',
  modalIdPrefix: 'feedback',

  data: new SlashCommandBuilder()
    .setName('feedback')
    .setDescription('Send feedback to the Trophi team')
    .addStringOption(opt =>
      opt.setName('type')
        .setDescription('What kind of feedback is this?')
        .setRequired(true)
        .addChoices(
          { name: '🐛 Bug Report',      value: 'bug' },
          { name: '💡 Feature Request', value: 'feature' },
          { name: '💬 General Feedback', value: 'general' }
        )
    ),

  async execute(interaction) {
    const type = interaction.options.getString('type');
    if (!TYPES[type]) {
      return replyError(interaction, 'Invalid feedback type.');
    }

    const modal = new ModalBuilder()
      .setCustomId(`feedback:${type}`)
      .setTitle(TYPES[type].label);

    const titleInput = new TextInputBuilder()
      .setCustomId('title')
      .setLabel('Title / Summary')
      .setPlaceholder(type === 'bug' ? 'Short description of the bug' : 'Short summary')
      .setStyle(TextInputStyle.Short)
      .setMinLength(3)
      .setMaxLength(MAX_TITLE)
      .setRequired(true);

    const descriptionInput = new TextInputBuilder()
      .setCustomId('description')
      .setLabel(type === 'bug' ? 'What happened? What did you expect?' : 'Tell us more')
      .setStyle(TextInputStyle.Paragraph)
      .setMinLength(10)
      .setMaxLength(MAX_DESCRIPTION)
      .setRequired(true);

    const contextInput = new TextInputBuilder()
      .setCustomId('context')
      .setLabel(type === 'bug' ? 'Browser / device info (optional)' : 'Examples or references (optional)')
      .setStyle(TextInputStyle.Short)
      .setMaxLength(MAX_CONTEXT)
      .setRequired(false);

    modal.addComponents(
      new ActionRowBuilder().addComponents(titleInput),
      new ActionRowBuilder().addComponents(descriptionInput),
      new ActionRowBuilder().addComponents(contextInput)
    );

    await interaction.showModal(modal);
  },

  async handleModal(interaction, { logger }) {
    if (!interaction.customId.startsWith('feedback:')) return;

    const type = interaction.customId.split(':')[1];
    const meta = TYPES[type] || TYPES.general;

    const title       = sanitize(interaction.fields.getTextInputValue('title'), MAX_TITLE);
    const description = sanitize(interaction.fields.getTextInputValue('description'), MAX_DESCRIPTION);
    const context     = sanitize(interaction.fields.getTextInputValue('context'), MAX_CONTEXT);

    if (!title || !description) {
      return replyError(interaction, 'Title and description cannot be empty.');
    }

    const channelId = config.channels?.feedback;
    if (!channelId) {
      logger.warn('FEEDBACK', 'Feedback channel is not configured in config.json');
      return replyError(interaction, 'Feedback channel is not configured. Please contact a moderator.');
    }

    const channel = await interaction.client.channels.fetch(channelId).catch(() => null);
    if (!channel?.isTextBased()) {
      logger.error('FEEDBACK', `Configured feedback channel ${channelId} is invalid or unreachable`);
      return replyError(interaction, 'Could not reach the feedback channel.');
    }

    const embed = baseEmbed(`${meta.label} — ${title}`, meta.color)
      .setDescription(description)
      .addFields({ name: 'Context', value: context || '_(none provided)_', inline: false })
      .setAuthor({
        name: `${interaction.user.tag} (${interaction.user.id})`,
        iconURL: interaction.user.displayAvatarURL({ dynamic: true })
      });

    try {
      await channel.send({
        embeds: [embed],
        // Hard mention guarantee: never ping anyone from feedback content.
        allowedMentions: { parse: [] }
      });
    } catch (err) {
      logger.error('FEEDBACK', `Failed to post in channel: ${err.message}`);
      return replyError(interaction, 'Failed to deliver your feedback. Please try again later.');
    }

    logger.info('FEEDBACK', `${meta.label} from ${interaction.user.tag}: ${title}`);

    const confirm = successEmbed('Feedback Received', interaction)
      .setColor(COLORS.success)
      .setDescription('Thank you! Your feedback has been sent to the Trophi team.');

    await interaction.reply({ embeds: [confirm], flags: MessageFlags.Ephemeral }).catch(() => {});
  }
};
