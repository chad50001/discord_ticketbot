/**
 * Button: tb_deleteCancel
 * Dismisses the delete confirmation.
 */
module.exports = {
  customId: 'tb_deleteCancel',

  async execute(client, interaction) {
    await interaction.update({ content: client.t('messages.deleteCancelled'), components: [] }).catch(() => null);
  },
};
