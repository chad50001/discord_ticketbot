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
  return new Intl.DateTimeFormat('en-GB', {
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
 * Build the shared message markup (identical for both designs — the renderers
 * only differ in surrounding chrome/CSS, the per-message DOM stays the same).
 * @param {import('discord.js').Message[]} messages
 * @param {Map<string,string>} avatarMap
 * @returns {string}
 */
function buildMessageRows(messages, avatarMap) {
  return messages.map(msg => {
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
            <time class="timestamp">${timestamp}</time>
          </div>
          ${content}${attachments}${embeds}
        </div>
      </div>`;
  }).join('');
}

/**
 * Classic design — the original Discord-inspired dark transcript.
 */
function renderClassic({ ticketInfo, channel, guildName, messageRows, messageCount, openedAt, closedAt }) {
  return `<!DOCTYPE html>
<html lang="en">
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
        <div class="meta-item"><strong>Type</strong>${escapeHtml(ticketInfo.type)}</div>
        <div class="meta-item"><strong>Created by</strong>&lt;@${ticketInfo.creator_id}&gt;</div>
        <div class="meta-item"><strong>Created on</strong>${openedAt}</div>
        <div class="meta-item"><strong>Closed on</strong>${closedAt}</div>
        ${ticketInfo.claimed_by ? `<div class="meta-item"><strong>Claimed by</strong>&lt;@${ticketInfo.claimed_by}&gt;</div>` : ''}
        <div class="meta-item"><strong>Priority</strong>${escapeHtml(ticketInfo.priority)}</div>
        <div class="meta-item"><strong>Messages</strong>${messageCount}</div>
      </div>
    </div>
  </div>
  <div class="messages">
    ${messageRows || '<p style="color:#72767d;text-align:center;padding:40px 0;">No messages</p>'}
  </div>
  <div class="footer">
    Generated on ${formatDate(new Date())} · Discord Ticket Bot
  </div>
</body>
</html>`;
}

/**
 * Modern design — minimal MSK-branded layout. Self-contained (no external
 * requests / offline-safe), system + monospace fonts only.
 */
function renderModern({ ticketInfo, channel, guildName, messageRows, messageCount, openedAt, closedAt }) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Ticket #${ticketInfo.id} – ${escapeHtml(channel.name)}</title>
  <style>
    /* ─── MSK Scripts — Ticket Transcript (modern) ──────────────────────── */
    :root {
      --bg:          #1c1f26;
      --bg-2:        #21252e;
      --panel:       #272c37;
      --panel-2:     #2e333f;
      --line:        rgba(255,255,255,.10);
      --line-strong: rgba(255,255,255,.16);
      --accent:      #2ee676;
      --accent-dim:  rgba(46,230,118,.16);
      --text:        #f3f4f7;
      --text-2:      #c7cad3;
      --muted:       #8b909c;
      --radius:      14px;
      --mono: ui-monospace, "SF Mono", "JetBrains Mono", "Cascadia Code", "Segoe UI Mono", Consolas, monospace;
      --sans: system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
    }
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    html { -webkit-text-size-adjust: 100%; }
    body {
      background:
        radial-gradient(1100px 460px at 50% -240px, rgba(46,230,118,.14), transparent 70%),
        var(--bg);
      background-attachment: fixed;
      color: var(--text);
      font-family: var(--sans);
      font-size: 15px; line-height: 1.6;
      -webkit-font-smoothing: antialiased;
      padding: 0 20px 80px;
    }
    .wrap { max-width: 880px; margin: 0 auto; }

    a { color: var(--accent); text-decoration: none; border-bottom: 1px solid transparent; }
    a:hover { border-bottom-color: rgba(46,230,118,.5); }
    code { background: var(--bg-2); padding: 1.5px 6px; border-radius: 5px; font-family: var(--mono); font-size: .85em; border: 1px solid var(--line); }
    pre { background: var(--bg-2); padding: 14px 16px; border-radius: 10px; overflow-x: auto; margin: 8px 0; border: 1px solid var(--line); }
    pre code { background: none; padding: 0; border: 0; }
    blockquote { border-left: 3px solid var(--accent); padding: 2px 14px; margin: 6px 0; color: var(--text-2); }
    strong { color: #fff; }
    .spoiler { background: #14161b; color: transparent; border-radius: 4px; cursor: pointer; padding: 0 3px; }
    .spoiler:hover { color: inherit; background: var(--bg-2); }
    .mention { background: var(--accent-dim); color: var(--accent); border-radius: 5px; padding: 0 5px; font-weight: 500; }

    /* ─── Header card ─────────────────────────────────────────────────── */
    .header {
      position: relative; overflow: hidden;
      background: linear-gradient(180deg, var(--panel) 0%, var(--bg-2) 100%);
      border: 1px solid var(--line); border-radius: var(--radius);
      padding: 30px 32px 26px; margin: 40px 0 14px;
      box-shadow: 0 18px 50px rgba(0,0,0,.32);
    }
    .header::before {
      content: ""; position: absolute; inset: 0 auto 0 0; width: 3px;
      background: linear-gradient(180deg, var(--accent), transparent);
    }
    .eyebrow {
      font-family: var(--mono); font-size: 11px; letter-spacing: .22em;
      text-transform: uppercase; color: var(--muted); margin-bottom: 10px;
      display: flex; align-items: center; gap: 8px;
    }
    .eyebrow .dot { width: 6px; height: 6px; border-radius: 50%; background: var(--accent); box-shadow: 0 0 10px var(--accent); }
    .header h1 { font-size: 30px; font-weight: 800; letter-spacing: -.02em; color: #fff; line-height: 1.1; }
    .header h1 span { color: var(--accent); font-family: var(--mono); font-weight: 700; }
    .subtitle { color: var(--text-2); margin-top: 6px; font-size: 14px; }
    .subtitle b { color: var(--text); font-weight: 600; }

    /* Flex chips so the last row stretches to fill — no empty grid cells. */
    .meta-grid { display: flex; flex-wrap: wrap; gap: 10px; margin-top: 24px; }
    .meta-item {
      flex: 1 1 150px; min-width: 140px;
      background: var(--panel-2); border: 1px solid var(--line);
      border-radius: 10px; padding: 12px 14px;
    }
    .meta-item .k {
      font-family: var(--mono); font-size: 10px; letter-spacing: .14em;
      text-transform: uppercase; color: var(--muted); display: block; margin-bottom: 4px;
    }
    .meta-item .v { color: var(--text); font-size: 14px; font-weight: 500; word-break: break-word; }

    .badge {
      font-family: var(--mono); font-size: 9px; font-weight: 700; letter-spacing: .08em;
      padding: 2px 6px; border-radius: 5px; margin-left: 6px; vertical-align: middle; text-transform: uppercase;
    }
    .badge.bot { background: var(--accent-dim); color: var(--accent); border: 1px solid rgba(46,230,118,.35); }

    /* ─── Messages ────────────────────────────────────────────────────── */
    .section-label {
      font-family: var(--mono); font-size: 11px; letter-spacing: .2em; text-transform: uppercase;
      color: var(--muted); padding: 26px 6px 12px; display: flex; align-items: center; gap: 12px;
    }
    .section-label::after { content: ""; flex: 1; height: 1px; background: var(--line); }

    .messages { display: flex; flex-direction: column; }
    .message {
      display: flex; gap: 16px; padding: 11px 14px;
      border-radius: 12px; transition: background .12s ease;
    }
    .message:hover { background: var(--panel); }
    .avatar {
      width: 42px; height: 42px; border-radius: 50%; flex-shrink: 0; margin-top: 1px;
      background: var(--panel-2); border: 1px solid var(--line-strong);
    }
    .message-body { flex: 1; min-width: 0; }
    .message-header { display: flex; align-items: baseline; gap: 10px; margin-bottom: 4px; flex-wrap: wrap; }
    .username { font-weight: 600; color: #fff; font-size: 15px; }
    .timestamp { font-family: var(--mono); font-size: 11px; color: var(--muted); letter-spacing: .02em; }
    .msg-content { word-break: break-word; color: var(--text); }

    .attachment-img {
      max-width: 420px; max-height: 320px; border-radius: 10px; margin-top: 8px;
      display: block; border: 1px solid var(--line);
    }
    .attachment-file {
      display: inline-flex; align-items: center; gap: 6px; background: var(--panel-2);
      padding: 8px 14px; border-radius: 8px; margin-top: 8px; font-size: 13px;
      border: 1px solid var(--line); color: var(--text-2);
    }
    .embed {
      background: var(--panel-2); border-left: 3px solid var(--accent); border-radius: 0 10px 10px 0;
      padding: 12px 16px; margin-top: 8px; max-width: 540px; border: 1px solid var(--line); border-left-width: 3px;
    }
    .embed-title { font-weight: 600; color: #fff; margin-bottom: 4px; }
    .embed-desc { color: var(--text-2); font-size: 14px; }

    .empty { color: var(--muted); text-align: center; padding: 60px 0; font-family: var(--mono); letter-spacing: .04em; }

    /* ─── Footer ──────────────────────────────────────────────────────── */
    .footer {
      text-align: center; padding: 34px 0 0; margin-top: 30px;
      border-top: 1px solid var(--line); color: var(--muted); font-size: 12px;
    }
    .footer .brand { color: var(--text-2); font-weight: 600; }
    .footer .brand b { color: var(--accent); }
    .footer .gen { font-family: var(--mono); font-size: 11px; margin-top: 6px; letter-spacing: .03em; }

    @media (max-width: 560px) {
      body { padding: 0 12px 60px; font-size: 14px; }
      .header { padding: 24px 20px; margin-top: 24px; }
      .header h1 { font-size: 24px; }
      .message { gap: 12px; padding: 10px 8px; }
      .avatar { width: 36px; height: 36px; }
    }
  </style>
</head>
<body>
  <div class="wrap">
    <header class="header">
      <div class="eyebrow"><span class="dot"></span> Ticket Transcript</div>
      <h1>Ticket <span>#${ticketInfo.id}</span></h1>
      <div class="subtitle"><b>${escapeHtml(channel.name)}</b> — ${escapeHtml(guildName)}</div>
      <div class="meta-grid">
        <div class="meta-item"><span class="k">Type</span><span class="v">${escapeHtml(ticketInfo.type)}</span></div>
        <div class="meta-item"><span class="k">Created by</span><span class="v">&lt;@${ticketInfo.creator_id}&gt;</span></div>
        <div class="meta-item"><span class="k">Created on</span><span class="v">${openedAt}</span></div>
        <div class="meta-item"><span class="k">Closed on</span><span class="v">${closedAt}</span></div>
        ${ticketInfo.claimed_by ? `<div class="meta-item"><span class="k">Claimed by</span><span class="v">&lt;@${ticketInfo.claimed_by}&gt;</span></div>` : ''}
        <div class="meta-item"><span class="k">Priority</span><span class="v">${escapeHtml(ticketInfo.priority)}</span></div>
        <div class="meta-item"><span class="k">Messages</span><span class="v">${messageCount}</span></div>
      </div>
    </header>

    <div class="section-label">Conversation</div>
    <main class="messages">
      ${messageRows || '<p class="empty">No messages in this ticket</p>'}
    </main>

    <footer class="footer">
      <div class="brand">MSK <b>Scripts</b> · Discord Ticket Bot</div>
      <div class="gen">Generated on ${formatDate(new Date())}</div>
    </footer>
  </div>
</body>
</html>`;
}

/**
 * Generate a self-contained HTML transcript.
 * @param {import('discord.js').TextChannel} channel
 * @param {object} ticketInfo  DB ticket row
 * @param {string} guildName
 * @param {string} [design]  "modern" (default) or "classic"
 * @returns {Promise<string>} Full HTML string
 */
async function generateTranscript(channel, ticketInfo, guildName, design = 'modern') {
  const messages  = await fetchAllMessages(channel);
  const avatarMap = await buildAvatarMap(messages);

  const messageRows = buildMessageRows(messages, avatarMap);
  const openedAt    = formatDate(new Date(ticketInfo.created_at));
  const closedAt    = ticketInfo.closed_at ? formatDate(new Date(ticketInfo.closed_at)) : '—';

  const ctx = {
    ticketInfo, channel, guildName,
    messageRows, messageCount: messages.length, openedAt, closedAt,
  };

  return design === 'classic' ? renderClassic(ctx) : renderModern(ctx);
}

module.exports = { generateTranscript };
