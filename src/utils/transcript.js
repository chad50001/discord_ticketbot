/**
 * Generates a self-contained HTML transcript from a Discord channel's messages.
 * Avatars are fetched and embedded as Base64 data URIs so the HTML works
 * without any external CDN requests (Discord blocks cross-origin avatar loads).
 */

// ─── Helpers ──────────────────────────────────────────────────────────────────

// Neutral grey silhouette — always visible, zero external requests.
// Used whenever an avatar cannot be fetched/embedded.
const PLACEHOLDER_AVATAR = `data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 40 40'><rect width='40' height='40' rx='20' fill='%2336393f'/><text x='50%25' y='55%25' text-anchor='middle' dominant-baseline='middle' font-size='18' fill='%2372767d'>?</text></svg>`;

function escapeHtml(str) {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function parseMarkdown(text) {
  if (!text) return '';
  let html = escapeHtml(text);

  html = html.replace(/```(?:\w+\n)?([\s\S]*?)```/g, '<pre><code>$1</code></pre>');
  html = html.replace(/`([^`]+)`/g, '<code>$1</code>');
  html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  html = html.replace(/\*(.+?)\*/g, '<em>$1</em>');
  html = html.replace(/_(.+?)_/g, '<em>$1</em>');
  html = html.replace(/__(.+?)__/g, '<u>$1</u>');
  html = html.replace(/~~(.+?)~~/g, '<s>$1</s>');
  html = html.replace(/^&gt; (.+)$/gm, '<blockquote>$1</blockquote>');
  html = html.replace(/\|\|(.+?)\|\|/g, '<span class="spoiler">$1</span>');
  html = html.replace(/&lt;@!?(\d+)&gt;/g, '<span class="mention">@$1</span>');
  html = html.replace(/&lt;#(\d+)&gt;/g, '<span class="mention">#$1</span>');
  html = html.replace(/&lt;@&amp;(\d+)&gt;/g, '<span class="mention">@role</span>');
  html = html.replace(/(https?:\/\/[^\s<>"]+)/g, '<a href="$1" target="_blank" rel="noopener">$1</a>');
  html = html.replace(/\n/g, '<br>');

  return html;
}

function formatDate(date) {
  return new Intl.DateTimeFormat('de-DE', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  }).format(date);
}

async function fetchAllMessages(channel) {
  const messages = [];
  let lastId;

  while (true) {
    const options = { limit: 100 };
    if (lastId) options.before = lastId;

    const batch = await channel.messages.fetch(options);
    if (batch.size === 0) break;

    messages.push(...batch.values());
    lastId = batch.last().id;

    if (batch.size < 100) break;
  }

  return messages.reverse();
}

/**
 * Fetches a remote image URL and returns a Base64 data URI string.
 * Returns a neutral SVG placeholder on failure so the transcript never
 * shows broken-image icons.
 *
 * Discord's CDN blocks cross-origin <img> loads when the HTML is served
 * from a third-party domain, so we embed avatars directly at generation time.
 *
 * @param {string} url
 * @returns {Promise<string>}  data URI or SVG placeholder
 */
async function fetchAsDataUri(url) {
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'MSK-TicketBot/1.0 transcript-generator' },
      signal: AbortSignal.timeout(8_000),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    const buffer      = Buffer.from(await res.arrayBuffer());
    const contentType = res.headers.get('content-type') || 'image/png';
    return `data:${contentType};base64,${buffer.toString('base64')}`;
  } catch {
    return PLACEHOLDER_AVATAR;
  }
}

/**
 * Build a map of { userId → base64DataUri } for every unique author
 * in the message list. Fetches are run in parallel.
 *
 * @param {import('discord.js').Message[]} messages
 * @returns {Promise<Map<string, string>>}
 */
async function buildAvatarMap(messages) {
  // Collect unique authors (id → avatarURL)
  const authorMap = new Map();
  for (const msg of messages) {
    if (!authorMap.has(msg.author.id)) {
      authorMap.set(
        msg.author.id,
        msg.author.displayAvatarURL({ extension: 'png', size: 64, forceStatic: true })
      );
    }
  }

  // Fetch all in parallel
  const entries = [...authorMap.entries()];
  const results = await Promise.allSettled(
    entries.map(([, url]) => fetchAsDataUri(url))
  );

  const avatarMap = new Map();
  entries.forEach(([id], i) => {
    const result = results[i];
    avatarMap.set(
      id,
      result.status === 'fulfilled' ? result.value : PLACEHOLDER_AVATAR
    );
  });

  return avatarMap;
}

// ─── Main ─────────────────────────────────────────────────────────────────────

/**
 * Generate a self-contained HTML transcript.
 * @param {import('discord.js').TextChannel} channel
 * @param {object} ticketInfo  DB ticket row
 * @param {string} guildName
 * @returns {Promise<string>} Full HTML string
 */
async function generateTranscript(channel, ticketInfo, guildName) {
  const messages  = await fetchAllMessages(channel);
  const avatarMap = await buildAvatarMap(messages);

  const messageRows = messages.map(msg => {
    const avatarSrc = avatarMap.get(msg.author.id) ?? '';
    const isBot     = msg.author.bot ? '<span class="badge bot">BOT</span>' : '';
    const timestamp = formatDate(msg.createdAt);

    const content = msg.content
      ? `<div class="msg-content">${parseMarkdown(msg.content)}</div>`
      : '';

    const attachments = msg.attachments.size > 0
      ? [...msg.attachments.values()].map(att => {
          if (att.contentType?.startsWith('image/')) {
            return `<img class="attachment-img" src="${att.url}" alt="${escapeHtml(att.name)}" loading="lazy">`;
          }
          return `<a class="attachment-file" href="${att.url}" target="_blank">📎 ${escapeHtml(att.name)}</a>`;
        }).join('')
      : '';

    const embeds = msg.embeds.map(e => {
      const title = e.title       ? `<div class="embed-title">${escapeHtml(e.title)}</div>`             : '';
      const desc  = e.description ? `<div class="embed-desc">${parseMarkdown(e.description)}</div>`    : '';
      const color = e.color != null
        ? `border-left: 4px solid #${e.color.toString(16).padStart(6, '0')}`
        : '';
      return `<div class="embed" style="${color}">${title}${desc}</div>`;
    }).join('');

    return `
      <div class="message">
        <img class="avatar" src="${avatarSrc}" alt="">
        <div class="message-body">
          <div class="message-header">
            <span class="username">${escapeHtml(msg.author.displayName ?? msg.author.username)}</span>
            ${isBot}
            <span class="timestamp">${timestamp}</span>
          </div>
          ${content}${attachments}${embeds}
        </div>
      </div>`;
  }).join('');

  const openedAt = formatDate(new Date(ticketInfo.created_at));
  const closedAt = ticketInfo.closed_at ? formatDate(new Date(ticketInfo.closed_at)) : '—';

  return `<!DOCTYPE html>
<html lang="de">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Ticket #${ticketInfo.id} – ${escapeHtml(channel.name)}</title>
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      background: #1e1f22; color: #dcddde;
      font-family: 'gg sans', 'Noto Sans', 'Helvetica Neue', Helvetica, Arial, sans-serif;
      font-size: 14px; line-height: 1.5;
    }
    a { color: #00aff4; }
    code { background: #2b2d31; padding: 1px 5px; border-radius: 4px; font-family: monospace; font-size: 13px; }
    pre { background: #2b2d31; padding: 12px; border-radius: 6px; overflow-x: auto; margin: 6px 0; }
    pre code { background: none; padding: 0; }
    blockquote { border-left: 4px solid #4f545c; padding: 0 12px; margin: 4px 0; color: #b9bbbe; }
    .spoiler { background: #202225; color: transparent; border-radius: 3px; cursor: pointer; }
    .spoiler:hover { color: inherit; }
    .header {
      background: #2b2d31; padding: 20px 32px;
      border-bottom: 2px solid #1e1f22;
      display: flex; justify-content: space-between; align-items: flex-start;
      flex-wrap: wrap; gap: 12px;
    }
    .header h1 { font-size: 20px; color: #fff; }
    .header h1 span { color: #5865f2; }
    .meta-grid { display: flex; flex-wrap: wrap; gap: 16px; margin-top: 10px; }
    .meta-item { font-size: 12px; color: #b9bbbe; }
    .meta-item strong { color: #dcddde; display: block; }
    .badge { font-size: 10px; font-weight: 700; padding: 1px 5px; border-radius: 4px; margin-left: 4px; vertical-align: middle; }
    .badge.bot { background: #5865f2; color: #fff; }
    .messages { padding: 16px 32px; max-width: 900px; margin: 0 auto; }
    .message {
      display: flex; gap: 14px; padding: 8px 4px;
      border-radius: 4px; transition: background .1s;
    }
    .message:hover { background: #2e3035; }
    .avatar { width: 40px; height: 40px; border-radius: 50%; flex-shrink: 0; margin-top: 2px; background: #36393f; }
    .message-body { flex: 1; min-width: 0; }
    .message-header { display: flex; align-items: baseline; gap: 8px; margin-bottom: 3px; }
    .username { font-weight: 600; color: #fff; }
    .timestamp { font-size: 11px; color: #72767d; }
    .msg-content { word-break: break-word; }
    .attachment-img { max-width: 400px; max-height: 300px; border-radius: 6px; margin-top: 6px; display: block; }
    .attachment-file { display: inline-block; background: #2b2d31; padding: 6px 12px; border-radius: 4px; margin-top: 6px; font-size: 13px; }
    .embed { background: #2b2d31; border-left: 4px solid #4f545c; border-radius: 0 4px 4px 0; padding: 10px 14px; margin-top: 6px; max-width: 520px; }
    .embed-title { font-weight: 600; color: #fff; margin-bottom: 4px; }
    .embed-desc { color: #b9bbbe; font-size: 13px; }
    .mention { background: rgba(88,101,242,.3); color: #dee0fc; border-radius: 3px; padding: 0 3px; font-weight: 500; }
    .footer { text-align: center; padding: 20px; color: #72767d; font-size: 12px; border-top: 1px solid #2b2d31; margin-top: 20px; }
  </style>
</head>
<body>
  <div class="header">
    <div>
      <h1>🎫 Ticket <span>#${ticketInfo.id}</span></h1>
      <div style="color:#b9bbbe;margin-top:4px;">${escapeHtml(channel.name)} — ${escapeHtml(guildName)}</div>
      <div class="meta-grid">
        <div class="meta-item"><strong>Typ</strong>${escapeHtml(ticketInfo.type)}</div>
        <div class="meta-item"><strong>Erstellt von</strong>&lt;@${ticketInfo.creator_id}&gt;</div>
        <div class="meta-item"><strong>Erstellt am</strong>${openedAt}</div>
        <div class="meta-item"><strong>Geschlossen am</strong>${closedAt}</div>
        ${ticketInfo.claimed_by ? `<div class="meta-item"><strong>Beansprucht von</strong>&lt;@${ticketInfo.claimed_by}&gt;</div>` : ''}
        <div class="meta-item"><strong>Priorität</strong>${escapeHtml(ticketInfo.priority)}</div>
        <div class="meta-item"><strong>Nachrichten</strong>${messages.length}</div>
      </div>
    </div>
  </div>
  <div class="messages">
    ${messageRows || '<p style="color:#72767d;text-align:center;padding:40px 0;">Keine Nachrichten</p>'}
  </div>
  <div class="footer">
    Generiert am ${formatDate(new Date())} · Discord Ticket Bot
  </div>
</body>
</html>`;
}

module.exports = { generateTranscript };
