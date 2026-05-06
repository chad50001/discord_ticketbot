/**
 * Command: /broadcast
 * Sends a message to all open ticket channels.
 * Optionally filtered by ticket type.
 * Staff-only.
 */
const { SlashCommandBuilder, EmbedBuilder, MessageFlags } = require('discord.js');
const { getAllOpenTickets } = require('../database');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('broadcast')
    .setDescription('Send a message to all open ticket channels')
    .addStringOption(opt =>
      opt
        .setName('message')
        .setDescription('The message to broadcast')
        .setRequired(true)
        .setMaxLength(2000)
    )
    .addStringOption(opt =>
      opt
        .setName('type')
        .setDescription('Only broadcast to a specific ticket type (leave empty for all)')
        .setRequired(false)
    )
    .addBooleanOption(opt =>
      opt
        .setName('embed')
        .setDescription('Send as an embed? (default: true)')
        .setRequired(false)
    ),

  async execute(client, interaction) {
    if (!client.isStaff(interaction.member)) {
      return interaction.reply({
        content: client.t('messages.noPermission'),
        flags: MessageFlags.Ephemeral,
      });
    }

    const message    = interaction.options.getString('message', true);
    const typeFilter = interaction.options.getString('type') ?? null;
    const asEmbed    = interaction.options.getBoolean('embed') ?? true;

    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const tickets = getAllOpenTickets(interaction.guildId, typeFilter);

    if (tickets.length === 0) {
      return interaction.editReply(
        `ℹ️ No open tickets found${typeFilter ? ` for type \`${typeFilter}\`` : ''}.`
      );
    }

    let sent   = 0;
    let failed = 0;

    for (const ticket of tickets) {
      try {
        const channel = await client.channels.fetch(ticket.channel_id).catch(() => null);
        if (!channel) { failed++; continue; }

        const payload = asEmbed
          ? {
              embeds: [
                new EmbedBuilder()
                  .setAuthor({
                    name:    `📢 Broadcast — ${interaction.user.username}`,
                    iconURL: interaction.user.displayAvatarURL(),
                  })
                  .setDescription(message)
                  .setColor(client.config.mainColor ?? '#5865F2')
                  .setTimestamp(),
              ],
            }
          : { content: `📢 **Broadcast:** ${message}` };

        await channel.send(payload);
        sent++;
      } catch {
        failed++;
      }
    }

    return interaction.editReply(
      `✅ Broadcast sent to **${sent}** ticket${sent !== 1 ? 's' : ''}` +
      (failed > 0 ? ` *(${failed} channel${failed !== 1 ? 's' : ''} failed)*` : '') +
      '.'
    );
  },
};
