const { updateLastActivity, getTicketByChannel, setLastNotifySent } = require('../database');

const NOTIFY_COOLDOWN_MS = 30 * 60_000; // 30 minutes between DM pings per ticket

module.exports = {
  name: 'messageCreate',

  async execute(client, message) {
    if (message.author.bot) return;
    if (!message.guild) return;

    // Track last activity for auto-close
    const ticket = client.db
      ? getTicketByChannel(message.channelId)
      : null;

    if (ticket && ticket.status === 'open') {
      try {
        updateLastActivity(message.channelId);
      } catch { /* ignore */ }

      // ── DM notification: alert creator when staff replies ────────────────────
      if (
        ticket.notify_on_reply &&
        message.author.id !== ticket.creator_id
      ) {
        try {
          const member = await message.guild.members.fetch(message.author.id).catch(() => null);
          if (member && client.isStaff(member)) {
            const now = Date.now();
            if (!ticket.last_notify_sent || now - ticket.last_notify_sent > NOTIFY_COOLDOWN_MS) {
              const creator = await message.guild.members.fetch(ticket.creator_id).catch(() => null);
              if (creator) {
                await creator.user.send({
                  embeds: [{
                    title: '🔔 Staff replied to your ticket!',
                    description:
                      `A staff member has replied in your **${ticket.type}** ticket.\n\n` +
                      `[🔗 Jump to ticket](https://discord.com/channels/${message.guildId}/${ticket.channel_id})`,
                    color: 0x5865f2,
                    timestamp: new Date().toISOString(),
                  }],
                }).catch(() => null);
                setLastNotifySent(ticket.channel_id);
              }
            }
          }
        } catch { /* ignore — don't let notification errors break activity tracking */ }
      }
    }
  },
};
