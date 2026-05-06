const {
  SlashCommandBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ActionRowBuilder
} = require('discord.js');
const { baseEmbed, successEmbed, replyError, COLORS } = require('../../utils/embeds');
const config = require('../../../config.json');

const TYPES = {
  bug: { label: '🐛 Bug Report', color: 0xFF6B6B },
  feature: { label: '💡 Feature Request', color: 0x4ECDC4 },
  general: { label: '💬 General Feedback', color: 0x5865F2 }
};

module.exports = {
  group: 'staff',

  data: new SlashCommandBuilder()
    .setName('feedback')
    .setDescription('Send feedback to the Trophi team')
    .addStringOption(opt =>
      opt.setName('type')
        .setDescription('What kind of feedback is this?')
        .setRequired(true)
        .addChoices(
          { name: '🐛 Bug Report', value: 'bug' },
          { name: '💡 Feature Request', value: 'feature' },
          { name: '💬 General Feedback', value: 'general' }
        )
    ),

  async execute(interaction) {
    const type = interaction.options.getString('type');

    const modal = new ModalBuilder()
      .setCustomId(`feedback:${type}`)
      .setTitle(TYPES[type].label);

    const titleInput = new TextInputBuilder()
      .setCustomId('title')
      .setLabel('Title / Summary')
      .setPlaceholder(type === 'bug' ? 'Short description of the bug' : 'Short summary')
      .setStyle(TextInputStyle.Short)
      .setMaxLength(100)
      .setRequired(true);

    const descriptionInput = new TextInputBuilder()
      .setCustomId('description')
      .setLabel(type === 'bug' ? 'What happened? What did you expect?' : 'Tell us more')
      .setStyle(TextInputStyle.Paragraph)
      .setMaxLength(2000)
      .setRequired(true);

    const contextInput = new TextInputBuilder()
      .setCustomId('context')
      .setLabel(type === 'bug' ? 'Browser / device info (optional)' : 'Examples or references (optional)')
      .setStyle(TextInputStyle.Short)
      .setMaxLength(200)
      .setRequired(false);

    modal.addComponents(
      new ActionRowBuilder().addComponents(titleInput),
      new ActionRowBuilder().addComponents(descriptionInput),
      new ActionRowBuilder().addComponents(contextInput)
    );

    await interaction.showModal(modal);
  },

  async handleModal(interaction, { logger }) {
    if (!interaction.customId.startsWith('feedback:')) return false;

    const type = interaction.customId.split(':')[1];
    const meta = TYPES[type] || TYPES.general;

    const title = interaction.fields.getTextInputValue('title');
    const description = interaction.fields.getTextInputValue('description');
    const context = interaction.fields.getTextInputValue('context') || '_(none)_';

    const channelId = config.channels?.feedback;
    if (!channelId) {
      await replyError(interaction, 'Feedback channel is not configured. Please contact a moderator.');
      return true;
    }

    const channel = await interaction.client.channels.fetch(channelId).catch(() => null);
    if (!channel) {
      await replyError(interaction, 'Could not reach the feedback channel.');
      return true;
    }

    const embed = baseEmbed(`${meta.label} — ${title}`, meta.color)
      .setDescription(description)
      .addFields({ name: 'Context', value: context, inline: false })
      .setAuthor({
        name: `${interaction.user.tag} (${interaction.user.id})`,
        iconURL: interaction.user.displayAvatarURL({ dynamic: true })
      });

    await channel.send({ embeds: [embed] }).catch(() => {});

    logger.info('FEEDBACK', `${meta.label} from ${interaction.user.tag}: ${title}`);

    const confirm = successEmbed('Feedback Received', interaction)
      .setColor(COLORS.success)
      .setDescription('Thank you! Your feedback has been sent to the Trophi team.');

    await interaction.reply({ embeds: [confirm], ephemeral: true });
    return true;
  }
};
