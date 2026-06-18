// Temporary preview generator — renders transcript.js with mock data. Safe to delete.
const fs = require('fs');
const { generateTranscript } = require('./src/utils/transcript');

function msg(id, name, content, opts = {}) {
  return {
    id, content,
    author: { id, username: name, displayName: name, bot: !!opts.bot,
      displayAvatarURL: () => `https://example.invalid/${id}.png` },
    createdAt: new Date(`2026-06-18T${opts.t || '12:00'}:00Z`),
    attachments: { size: 0, values: () => [] },
    embeds: opts.embeds || [],
  };
}

const messages = [
  msg('100', 'lukas_dev', 'Hey, I need help setting up the **config.jsonc** for my hosted bot.', { t: '12:01' }),
  msg('101', 'MSK Support', 'Sure! Can you share the error from `journalctl`?\n```\nError: ECONNREFUSED 127.0.0.1:3306\n```', { bot: true, t: '12:03' }),
  msg('100', 'lukas_dev', 'Here it is. The DB host seems wrong.', { t: '12:05' }),
  msg('102', 'Moritz', 'Looks like the `DB_HOST` in your `.env` points to localhost. Use the container name instead.', { t: '12:08',
    embeds: [{ title: 'Fix applied', description: 'Updated `.env` → restarting the bot via PM2.', color: 0x00e676 }] }),
  msg('100', 'lukas_dev', 'It works now, thank you! 🎉', { t: '12:12' }),
];

const channel = {
  name: 'ticket-0042-support',
  messages: { fetch: async (o) => ({ size: o.before ? 0 : messages.length, values: () => messages, last: () => messages[messages.length-1] }) },
};

const ticketInfo = {
  id: 42, type: 'Support', creator_id: '100', claimed_by: '102',
  priority: 'High', created_at: '2026-06-18T12:00:00Z', closed_at: '2026-06-18T12:15:00Z',
};

(async () => {
  const modern = await generateTranscript(channel, ticketInfo, 'MSK Scripts Community', 'modern');
  fs.writeFileSync('preview-transcript.html', modern);
  const classic = await generateTranscript(channel, ticketInfo, 'MSK Scripts Community', 'classic');
  fs.writeFileSync('preview-transcript-classic.html', classic);
  console.log('written preview-transcript.html (modern) + preview-transcript-classic.html');
})();
