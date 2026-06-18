// Preview generator — renders the transcript with mock data so the modern and
// classic designs can be reviewed in a browser without running the bot.
//
//   node docs/preview/preview-transcript.js
//
// Writes preview-transcript.html (modern) + preview-transcript-classic.html
// next to this file. Note: custom emojis are fetched from Discord's CDN at
// generation time — offline they fall back to ":name:" text (in the live bot
// they are embedded as images). Safe to delete this folder.

const fs   = require('fs');
const path = require('path');
const { generateTranscript } = require(path.join(__dirname, '../../src/utils/transcript'));

// Member directory for name resolution (id → display name)
const MEMBERS = {
  '283339135068930048': 'Musiker15',
  '102':                'Moritz',
  '900':                'StaffAnna',
  '101':                'MSK Support',
};
const member = (id) => ({ id, displayName: MEMBERS[id], user: { username: MEMBERS[id] } });

function msg(id, name, content, opts = {}) {
  const mentionIds  = (content.match(/<@!?(\d+)>/g) || []).map(s => s.replace(/[<@!>]/g, ''));
  const membersColl = new Map(mentionIds.filter(i => MEMBERS[i]).map(i => [i, member(i)]));
  return {
    id, content,
    author: { id, username: name, displayName: name, bot: !!opts.bot,
      displayAvatarURL: () => `https://example.invalid/${id}.png` },
    member: { displayName: name },
    mentions: { members: { values: () => membersColl.values() }, users: { values: () => [] } },
    createdAt: new Date(`2026-06-18T${opts.t || '12:00'}:00Z`),
    attachments: { size: 0, values: () => [] },
    embeds: opts.embeds || [],
  };
}

const messages = [
  msg('101', 'MSK Support',
    'Hello <@283339135068930048>! Thank you for opening a ticket. A team member will be with you shortly.',
    { bot: true, t: '12:00',
      embeds: [{ title: 'Ticket Opened', description: 'Hello <@283339135068930048> 👋\n**Type:** Custom Order\n**Priority:** 🟡 Medium', color: 0x2ee676 }] }),
  msg('283339135068930048', 'Musiker15',
    'Hey, I need help with **bold**, *italic*, ~~strike~~ and a custom emoji <:susge:1080594595303399454> plus inline `code inline`.',
    { t: '12:01' }),
  msg('283339135068930048', 'Musiker15',
    '> A short quote\nCode block **without** language:\n```\ncode block blabla\n```',
    { t: '12:02' }),
  msg('102', 'Moritz',
    'And one **with** a language label:\n```lua\n-- Code Block mit lua highlighting\nlocal test = function()\n    return true\nend\n```',
    { t: '12:05' }),
  msg('283339135068930048', 'Musiker15', 'Perfect, it works now. Thanks <@102>! 🎉', { t: '12:08' }),
];

const guild = {
  members: { fetch: async (id) => (MEMBERS[id] ? member(id) : Promise.reject(new Error('not found'))) },
};
const channel = {
  name: 'ticket-musiker15',
  guild,
  client: { users: { fetch: async (id) => (MEMBERS[id] ? { username: MEMBERS[id], displayName: MEMBERS[id] } : Promise.reject(new Error('no'))) } },
  messages: { fetch: async (o) => ({ size: o.before ? 0 : messages.length, values: () => messages, last: () => messages[messages.length - 1] }) },
};

const ticketInfo = {
  id: 41, type: 'Custom Order',
  creator_id: '283339135068930048',
  claimed_by: '102',
  closed_by: '900',
  close_reason: 'Issue resolved — DB host fixed.',
  priority: 'medium',
  created_at: '2026-06-18T12:00:00Z',
  closed_at:  '2026-06-18T12:10:00Z',
};

(async () => {
  const modern  = await generateTranscript(channel, ticketInfo, 'MSK Scripts', 'modern');
  const classic = await generateTranscript(channel, ticketInfo, 'MSK Scripts', 'classic');
  fs.writeFileSync(path.join(__dirname, 'preview-transcript.html'), modern);
  fs.writeFileSync(path.join(__dirname, 'preview-transcript-classic.html'), classic);
  console.log('written docs/preview/preview-transcript.html (modern) + preview-transcript-classic.html (classic)');
})();
