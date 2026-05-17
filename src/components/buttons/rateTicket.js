const {
  ModalBuilder, TextInputBuilder, TextInputStyle,
  ActionRowBuilder, MessageFlags,
} = require('discord.js');
const { getRating } = require('../../database');

module.exports = {
  customId: 'tb_rate',

  async execute(client, interaction) {
    const rating = parseInt(interaction.customId.split(':')[1], 10);

    if (isNaN(rating) || rating < 1 || rating > 5) {
      return interaction.reply({ content: '❌ Ungültige Bewertung.', flags: MessageFlags.Ephemeral });
    }

    let ticketId = null;
    const embed = interaction.message?.embeds?.[0];
    if (embed?.description) {
      const match = embed.description.match(/#(\d+)/);
      if (match) ticketId = parseInt(match[1], 10);
    }

    if (!ticketId) {
      return interaction.reply({ content: '❌ Ticket-Referenz nicht gefunden.', flags: MessageFlags.Ephemeral });
    }

    if (getRating(ticketId)) {
      return interaction.reply({ content: '✅ Du hast dieses Ticket bereits bewertet.', flags: MessageFlags.Ephemeral });
    }

    const modal = new ModalBuilder()
      .setCustomId(`tb_modalRate:${rating}:${ticketId}`)
      .setTitle(client.t('modals.rateComment.title'));

    modal.addComponents(
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId('rate_comment')
          .setLabel(client.t('modals.rateComment.label'))
          .setPlaceholder(client.t('modals.rateComment.placeholder'))
          .setStyle(TextInputStyle.Paragraph)
          .setRequired(false)
          .setMaxLength(1000)
      )
    );

    await interaction.showModal(modal);
  },
};
