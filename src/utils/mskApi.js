/**
 * MSK API Client
 * Handles all communication between the bot and msk-scripts.de.
 * The server is the single source of truth – the bot only sends data.
 */

const MSK_API_URL = process.env.MSK_API_URL ?? 'https://www.msk-scripts.de';
const MSK_API_KEY = process.env.MSK_API_KEY ?? '';

/**
 * Upload a transcript HTML to the MSK server.
 * The server determines the guild tier from the API key – not from this request.
 *
 * @param {object} opts
 * @param {number}  opts.ticketId       – ticket DB id
 * @param {string}  opts.transcriptHtml – full HTML string
 * @param {Array}   opts.attachments    – optional array of { name, data (Buffer), mimeType }
 * @returns {Promise<{ success: boolean, url: string|null, error: string|null }>}
 */
async function uploadTranscript({ ticketId, transcriptHtml, attachments = [] }) {
  if (!MSK_API_KEY) {
    return { success: false, url: null, error: 'MSK_API_KEY is not configured.' };
  }

  // Convert Buffer attachments to base64
  const serializedAttachments = attachments.map(att => ({
    name:     att.name,
    mimeType: att.mimeType,
    data:     Buffer.isBuffer(att.data)
      ? att.data.toString('base64')
      : att.data,
  }));

  let response;
  try {
    response = await fetch(`${MSK_API_URL}/api/transcript/upload`, {
      method:  'POST',
      headers: {
        'Content-Type':  'application/json',
        'Authorization': `Bearer ${MSK_API_KEY}`,
      },
      body: JSON.stringify({
        ticketId,
        transcriptHtml,
        attachments: serializedAttachments,
      }),
    });
  } catch (err) {
    return { success: false, url: null, error: `Network error: ${err.message}` };
  }

  let data;
  try {
    data = await response.json();
  } catch {
    return { success: false, url: null, error: `Invalid response from server (HTTP ${response.status}).` };
  }

  if (!response.ok) {
    return { success: false, url: null, error: data?.error ?? `Server error (HTTP ${response.status}).` };
  }

  return { success: true, url: data.url, tier: data.tier, expiresAt: data.expiresAt, error: null };
}

module.exports = { uploadTranscript };
