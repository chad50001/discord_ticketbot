const {
  SlashCommandBuilder,
  EmbedBuilder,
  PermissionFlagsBits,
} = require('discord.js');

const { getAllSnippets, getSnippet, applyPlaceholders } = require('../utils/snippets');

// ─── Helper ──────────────────────────────────────────────────────────────────

/**
 * Checks whether a staff member has permission to use snippets in this channel.
 * Mirrors the staff-role check used by other commands (claim, note, …).
 */
function isStaff(member, ticket, config) {
  // Type-specific staff roles take precedence, fall back to global list
  const staffRoles =
    ticket?.staffRoles?.length
      ? ticket.staffRoles
      : config.rolesWhoHaveAccessToTheTickets ?? [];

  return (
    member.permissions.has(PermissionFlagsBits.Administrator) ||
    staffRoles.some(roleId => member.roles.cache.has(roleId))
  );
}

// ─── Command definition ───────────────────────────────────────────────────────

module.exports = {
  data: new SlashCommandBuilder()
    .setName('snippet')
    .setDescription('Send a pre-defined canned response (staff only)')
    .addSubcommand(sub =>
      sub
        .setName('send')
        .setDescription('Send a snippet into this ticket')
        .addStringOption(opt =>
          opt
            .setName('name')
            .setDescription('Name of the snippet to send')
            .setRequired(true)
            .setAutocomplete(true)
        )
    )
    .addSubcommand(sub =>
      sub
        .setName('list')
        .setDescription('Show all available snippets')
    ),

  // ── Autocomplete ───────────────────────────────────────────────────────────
  async autocomplete(interaction) {
    const focusedValue = interaction.options.getFocused().toLowerCase();
    let choices = [];

    try {
      const snippets = getAllSnippets();
      choices = snippets
        .filter(s => s.name.toLowerCase().includes(focusedValue) ||
                     (s.description ?? '').toLowerCase().includes(focusedValue))
        .slice(0, 25) // Discord autocomplete limit
        .map(s => ({
          name: `${s.name}${s.description ? ` — ${s.description}` : ''}`.slice(0, 100),
          value: s.name,
        }));
    } catch {
      // snippets.jsonc missing or invalid — return empty list silently
    }

    await interaction.respond(choices);
  },

  // ── Execute ────────────────────────────────────────────────────────────────
  async execute(interaction, client) {
    const { options, channel, member, guild } = interaction;
    const config = client.config;
    const db     = client.db;
    const t      = client.t.bind(client); // i18n helper

    // ── Fetch ticket from DB ──────────────────────────────────────────────────
    const ticket = db.getTicketByChannelId?.(channel.id) ?? null;

    if (!ticket || ticket.status === 'closed') {
      return interaction.reply({
        content: t('snippet_not_in_ticket'),
        ephemeral: true,
      });
    }

    // ── Staff check ───────────────────────────────────────────────────────────
    if (!isStaff(member, ticket, config)) {
      return interaction.reply({
        content: t('no_permission'),
        ephemeral: true,
      });
    }

    const sub = options.getSubcommand();

    // ─────────────────────────────────────────────────────────────────────────
    // /snippet list
    // ─────────────────────────────────────────────────────────────────────────
    if (sub === 'list') {
      let snippets;
      try {
        snippets = getAllSnippets();
      } catch (err) {
        return interaction.reply({ content: `❌ ${err.message}`, ephemeral: true });
      }

      if (snippets.length === 0) {
        return interaction.reply({
          content: t('snippet_list_empty'),
          ephemeral: true,
        });
      }

      const embed = new EmbedBuilder()
        .setTitle('📋 Available Snippets')
        .setColor(config.mainColor ?? '#5865F2')
        .setDescription(
          snippets
            .map(s => `\`/snippet send ${s.name}\`\n> ${s.description ?? s.content.slice(0, 60).replace(/\n/g, ' ')}…`)
            .join('\n\n')
        )
        .setFooter({ text: `${snippets.length} snippet${snippets.length !== 1 ? 's' : ''} available` });

      return interaction.reply({ embeds: [embed], ephemeral: true });
    }

    // ─────────────────────────────────────────────────────────────────────────
    // /snippet send <name>
    // ─────────────────────────────────────────────────────────────────────────
    if (sub === 'send') {
      const name = options.getString('name', true);

      let snippet;
      try {
        snippet = getSnippet(name);
      } catch (err) {
        return interaction.reply({ content: `❌ ${err.message}`, ephemeral: true });
      }

      if (!snippet) {
        return interaction.reply({
          content: t('snippet_not_found', { name }),
          ephemeral: true,
        });
      }

      // Resolve placeholder values from DB + guild
      const creatorId = ticket.userId ?? ticket.creatorId ?? null;
      const typeConfig = config.ticketTypes?.find(tt => tt.codeName === ticket.type) ?? {};

      const placeholders = {
        user:     creatorId  ? `<@${creatorId}>`    : '',
        staff:    member.id  ? `<@${member.id}>`    : '',
        type:     typeConfig.name ?? ticket.type    ?? '',
        priority: ticket.priority                   ?? '',
      };

      const content = applyPlaceholders(snippet.content, placeholders);

      // Build message payload
      const payload = {};

      if (snippet.embed) {
        const embed = new EmbedBuilder()
          .setDescription(content)
          .setColor(snippet.embed.color ?? config.mainColor ?? '#5865F2');

        if (snippet.embed.title) embed.setTitle(snippet.embed.title);

        payload.embeds = [embed];
      } else {
        payload.content = content;
      }

      // Defer so we can send the snippet as a proper channel message
      // (not an ephemeral — the point is everyone in the ticket sees it)
      await interaction.deferReply({ ephemeral: true });
      await channel.send(payload);

      return interaction.editReply({
        content: t('snippet_sent', { name: snippet.name }),
      });
    }
  },
};