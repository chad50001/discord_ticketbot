const { ActivityType } = require('discord.js');
const { getInactiveTickets, getTicketsNeedingStaffReminder, closeTicket, setStaffReminded, getStats } = require('../database');
const { generateTranscript } = require('../utils/transcript');
const { ticketClosedEmbed, ticketLogEmbed } = require('../utils/embeds');

const ACTIVITY_TYPE_MAP = {
  PLAYING:   ActivityType.Playing,
  WATCHING:  ActivityType.Watching,
  LISTENING: ActivityType.Listening,
  STREAMING: ActivityType.Streaming,
  COMPETING: ActivityType.Competing,
};

module.exports = {
  name: 'clientReady', // renamed from 'ready' in Discord.js v14 to avoid conflict with gateway READY
  once: true,

  async execute(client) {
    client.logger.success(`[Ready] Logged in as ${client.user.tag}`);
    client.logger.info(`[Ready] Serving ${client.guilds.cache.size} guild(s).`);

    const reset  = '\x1b[0m';
    const purple = '\x1b[38;2;157;101;254m';
    const gray   = '\x1b[90m';
    const green  = '\x1b[38;2;94;177;49m';
    console.log('');
    console.log(`${green}  ✔ MSK Ticket Bot successfully started!${reset}`);
    console.log(`${gray}  ──────────────────────────────────────────${reset}`);
    console.log(`${gray}  Bot       ${reset}${client.user.tag}`);
    console.log(`${gray}  Guilds    ${reset}${client.guilds.cache.size}`);
    console.log(`${gray}  Commands  ${reset}${client.commands.size}`);
    console.log('');

    // ── Bot status ────────────────────────────────────────────────────────────
    const { status: statusCfg } = client.config;
    if (statusCfg?.enabled) {
      if (statusCfg.dynamic) {
        // Dynamic: update periodically with live ticket count
        const intervalMin = statusCfg.dynamicInterval ?? 5;
        setInterval(() => updateDynamicStatus(client), intervalMin * 60_000);
        setTimeout(() => updateDynamicStatus(client), 2_000); // initial update after cache is ready
        client.logger.info(`[Ready] Dynamic status enabled — updates every ${intervalMin}min`);
      } else {
        // Static status
        client.user.setPresence({
          status: statusCfg.status ?? 'online',
          activities: [{
            name: statusCfg.text ?? 'Support Tickets',
            type: ACTIVITY_TYPE_MAP[statusCfg.type] ?? ActivityType.Watching,
            url:  statusCfg.url || undefined,
          }],
        });
        client.logger.info(`[Ready] Status set: ${statusCfg.type} "${statusCfg.text}"`);
      }
    }

    // ── Auto-close loop ───────────────────────────────────────────────────────
    const autoCfg = client.config.autoClose;
    if (autoCfg?.enabled) {
      const thresholdMs    = (autoCfg.inactiveHours   ?? 48) * 3_600_000;
      const warnMs         = (autoCfg.warnBeforeHours ?? 6)  * 3_600_000;
      const excludeClaimed = autoCfg.excludeClaimed ?? true;

      client.logger.info(`[AutoClose] Enabled — threshold: ${autoCfg.inactiveHours}h`);
      setInterval(() => runAutoClose(client, thresholdMs, warnMs, excludeClaimed), 30 * 60_000);
      runAutoClose(client, thresholdMs, warnMs, excludeClaimed);
    }

    // ── Staff-reminder loop ───────────────────────────────────────────────────
    const reminderCfg = client.config.staffReminder;
    if (reminderCfg?.enabled) {
      const reminderMs = (reminderCfg.afterHours ?? 4) * 3_600_000;

      client.logger.info(`[StaffReminder] Enabled — after ${reminderCfg.afterHours}h without response`);
      setInterval(() => runStaffReminder(client, reminderMs), 15 * 60_000);
      runStaffReminder(client, reminderMs);
    }
  },
};

// ─── Auto-close ───────────────────────────────────────────────────────────────

async function runAutoClose(client, thresholdMs, warnMs, excludeClaimed) {
  const warnThreshold = thresholdMs - warnMs;
  let tickets;

  try {
    tickets = getInactiveTickets(warnThreshold, excludeClaimed);
  } catch (err) {
    client.logger.error('[AutoClose] DB error:', err);
    return;
  }

  for (const ticket of tickets) {
    try {
      const channel = await client.channels.fetch(ticket.channel_id).catch(() => null);
      if (!channel) continue;

      const idleMs      = Date.now() - ticket.last_activity;
      const shouldClose = idleMs >= thresholdMs;

      if (shouldClose) {
        const reason = 'Automatisch geschlossen wegen Inaktivität';
        let transcriptHtml = null;

        if (client.config.closeOption?.createTranscript) {
          transcriptHtml = await generateTranscript(channel, ticket, channel.guild.name).catch(() => null);
        }

        closeTicket(ticket.channel_id, client.user.id, reason, transcriptHtml);

        await channel.send({ embeds: [ticketClosedEmbed(client, { closer: client.user, reason })] }).catch(() => null);

        const closedCatId = client.config.closeOption?.closeTicketCategoryId;
        if (closedCatId) {
          await channel.setParent(closedCatId, { lockPermissions: false }).catch(() => null);
        }

        if (client.config.logs && client.config.logsChannelId) {
          const logChannel = await client.channels.fetch(client.config.logsChannelId).catch(() => null);
          if (logChannel) {
            const { AttachmentBuilder } = require('discord.js');
            const files = transcriptHtml
              ? [new AttachmentBuilder(Buffer.from(transcriptHtml, 'utf-8'), { name: `ticket-${ticket.id}.html` })]
              : [];
            await logChannel.send({
              embeds: [ticketLogEmbed(client, {
                ticket, closer: client.user, reason,
                duration: Date.now() - ticket.created_at, transcriptUrl: null,
              })],
              files,
            }).catch(() => null);
          }
        }

        client.logger.info(`[AutoClose] Closed ticket #${ticket.id}`);
      } else {
        // Send warning once when entering the warn window
        const warnKey = `autoclose_warned_${ticket.channel_id}`;
        if (!client[warnKey]) {
          client[warnKey] = true;
          const hoursLeft = Math.ceil((thresholdMs - idleMs) / 3_600_000);
          await channel.send(
            client.t('messages.autoCloseWarning', { hours: String(hoursLeft) })
          ).catch(() => null);
        }
      }
    } catch (err) {
      client.logger.error(`[AutoClose] Error on ticket ${ticket.id}:`, err);
    }
  }
}

// ─── Dynamic Status ─────────────────────────────────────────────────────────────

async function updateDynamicStatus(client) {
  const guildId = process.env.GUILD_ID;
  if (!guildId) return;
  try {
    const stats        = getStats(guildId);
    const statusCfg    = client.config.status;
    const textTemplate = statusCfg.dynamicText ?? '🎫 {open} open tickets';
    const text         = textTemplate
      .replace(/\{open\}/g,   String(stats.open))
      .replace(/\{total\}/g,  String(stats.total))
      .replace(/\{closed\}/g, String(stats.closed));

    client.user.setPresence({
      status: statusCfg.status ?? 'online',
      activities: [{
        name: text,
        type: ACTIVITY_TYPE_MAP[statusCfg.type] ?? ActivityType.Watching,
        url:  statusCfg.url || undefined,
      }],
    });
  } catch (err) {
    client.logger.warn(`[DynamicStatus] Failed to update: ${err.message}`);
  }
}

// ─── Staff reminder ───────────────────────────────────────────────────────────

async function runStaffReminder(client, reminderMs) {
  let tickets;

  try {
    tickets = getTicketsNeedingStaffReminder(reminderMs);
  } catch (err) {
    client.logger.error('[StaffReminder] DB error:', err);
    return;
  }

  const reminderCfg = client.config.staffReminder;
  const staffRoles  = client.config.rolesWhoHaveAccessToTheTickets ?? [];

  const pingStr = reminderCfg.pingRoles && staffRoles.length > 0
    ? staffRoles.map(id => `<@&${id}>`).join(' ')
    : '';

  for (const ticket of tickets) {
    try {
      const channel = await client.channels.fetch(ticket.channel_id).catch(() => null);
      if (!channel) continue;

      const hoursIdle = Math.floor((Date.now() - ticket.last_activity) / 3_600_000);

      const content = [
        pingStr,
        `⏰ **Keine Staff-Antwort seit ${hoursIdle} Stunden!**`,
        `Ticket <#${ticket.channel_id}> (Typ: **${ticket.type}**, Priorität: **${ticket.priority}**) wartet auf eine Rückmeldung.`,
      ].filter(Boolean).join('\n');

      await channel.send({ content }).catch(() => null);

      setStaffReminded(ticket.channel_id);

      client.logger.info(`[StaffReminder] Reminded ticket #${ticket.id} (${hoursIdle}h idle)`);
    } catch (err) {
      client.logger.error(`[StaffReminder] Error on ticket ${ticket.id}:`, err);
    }
  }
}
