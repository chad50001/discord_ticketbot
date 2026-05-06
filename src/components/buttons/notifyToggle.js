/**
 * Button: tb_notifyToggle
 * Toggles DM notifications for the ticket creator.
 * Only the ticket creator can interact with this button.
 */
const {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  MessageFlags,
} = require('discord.js');
const { getTicketByChannel, setNotifyOnReply } = require('../../database');

module.exports = {
  customId: 'tb_notifyToggle',

  async execute(client, interaction) {
    const ticket = getTicketByChannel(interaction.channelId);

    if (!ticket) {
      return interaction.reply({
        content: client.t('messages.notATicket'),
        flags: MessageFlags.Ephemeral,
      });
    }

    // Only the ticket creator may toggle this
    if (interaction.user.id !== ticket.creator_id) {
      return interaction.reply({
        content: '❌ Only the ticket creator can toggle notifications.',
        flags: MessageFlags.Ephemeral,
      });
    }

    const newValue = ticket.notify_on_reply ? 0 : 1;
    setNotifyOnReply(interaction.channelId, newValue);

    const newRow = new ActionRowBuilder().addComponents(
      buildNotifyButton(newValue === 1)
    );

    await interaction.update({ components: [newRow] }).catch(() => null);
  },
};

/**
 * Builds the notification toggle button.
 * @param {boolean} enabled  Current notification state
 * @returns {ButtonBuilder}
 */
function buildNotifyButton(enabled) {
  return new ButtonBuilder()
    .setCustomId('tb_notifyToggle')
    .setLabel(enabled ? 'Notifications On' : 'Notify me when staff replies')
    .setEmoji(enabled ? '🔔' : '🔕')
    .setStyle(enabled ? ButtonStyle.Success : ButtonStyle.Secondary);
}

module.exports.buildNotifyButton = buildNotifyButton;
