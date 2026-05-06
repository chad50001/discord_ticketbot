const fs   = require('fs');
const path = require('path');

// __dirname = src/utils  →  ../../config = project root / config  ✓
const SNIPPETS_PATH = path.join(__dirname, '../../config/snippets.jsonc');

let _cache = null;

// ─── JSONC Parser ─────────────────────────────────────────────────────────────
// Identical to the implementation in src/config.js.
// Strips // and /* … */ comments while preserving content inside string literals
// (e.g. URLs like https://docu.msk-scripts.de), then removes trailing commas.

function stripJsonComments(text) {
  let result   = '';
  let i        = 0;
  let inString = false;

  while (i < text.length) {
    const ch = text[i];

    // Inside a string literal
    if (inString) {
      if (ch === '\\') {
        result += ch + (text[i + 1] ?? '');
        i += 2;
        continue;
      }
      if (ch === '"') inString = false;
      result += ch;
      i++;
      continue;
    }

    // Start of a string literal
    if (ch === '"') {
      inString = true;
      result += ch;
      i++;
      continue;
    }

    // Single-line comment (//)
    if (ch === '/' && text[i + 1] === '/') {
      while (i < text.length && text[i] !== '\n') i++;
      continue;
    }

    // Multi-line comment (/* … */)
    if (ch === '/' && text[i + 1] === '*') {
      i += 2;
      while (i < text.length && !(text[i] === '*' && text[i + 1] === '/')) i++;
      i += 2;
      continue;
    }

    result += ch;
    i++;
  }

  // Remove trailing commas before } or ]
  result = result.replace(/,(\s*[}\]])/g, '$1');

  return result;
}

// ─── Loader ───────────────────────────────────────────────────────────────────

/**
 * Loads and validates snippets.jsonc.
 * Result is cached in memory; call clearCache() to force a reload.
 * @returns {Array} Parsed snippets array
 * @throws {Error} If the file is missing, invalid JSON, or fails validation
 */
function loadSnippets() {
  if (_cache) return _cache;

  if (!fs.existsSync(SNIPPETS_PATH)) {
    throw new Error(
      `[Snippets] config/snippets.jsonc not found.\n` +
      `Copy config/snippets.example.jsonc to config/snippets.jsonc and adjust it.`
    );
  }

  let raw;
  try {
    raw = fs.readFileSync(SNIPPETS_PATH, 'utf-8');
  } catch (err) {
    throw new Error(`[Snippets] Failed to read snippets.jsonc: ${err.message}`);
  }

  let parsed;
  try {
    parsed = JSON.parse(stripJsonComments(raw));
  } catch (err) {
    throw new Error(`[Snippets] Invalid JSON in snippets.jsonc: ${err.message}`);
  }

  if (!Array.isArray(parsed?.snippets)) {
    throw new Error(`[Snippets] snippets.jsonc must contain a top-level "snippets" array.`);
  }

  // Validate each entry
  for (const s of parsed.snippets) {
    if (typeof s.name !== 'string' || !s.name.trim()) {
      throw new Error(`[Snippets] Every snippet must have a non-empty "name" string.`);
    }
    if (/\s/.test(s.name)) {
      throw new Error(`[Snippets] Snippet name "${s.name}" must not contain whitespace.`);
    }
    if (typeof s.content !== 'string' || !s.content.trim()) {
      throw new Error(`[Snippets] Snippet "${s.name}" must have a non-empty "content" string.`);
    }
  }

  // Duplicate name check (case-insensitive)
  const seen = new Set();
  for (const s of parsed.snippets) {
    const key = s.name.toLowerCase();
    if (seen.has(key)) {
      throw new Error(`[Snippets] Duplicate snippet name: "${s.name}". Names must be unique.`);
    }
    seen.add(key);
  }

  _cache = parsed.snippets;
  return _cache;
}

// ─── Public API ───────────────────────────────────────────────────────────────

/** Returns all snippets. */
function getAllSnippets() {
  return loadSnippets();
}

/**
 * Returns a single snippet by name (case-insensitive), or null if not found.
 * @param {string} name
 */
function getSnippet(name) {
  return loadSnippets().find(s => s.name.toLowerCase() === name.toLowerCase()) ?? null;
}

/**
 * Clears the in-memory cache so snippets.jsonc is re-read on the next call.
 */
function clearCache() {
  _cache = null;
}

/**
 * Replaces all supported placeholders in a snippet's content string.
 *
 * Available placeholders:
 *   {user}      → Ticket creator mention  (<@123456>)
 *   {staff}     → Staff member mention    (<@789012>)
 *   {type}      → Ticket type name        (e.g. "Support")
 *   {priority}  → Current priority label  (e.g. "🟡 Medium")
 *
 * @param {string} content
 * @param {{ user?: string, staff?: string, type?: string, priority?: string }} vars
 * @returns {string}
 */
function applyPlaceholders(content, { user = '', staff = '', type = '', priority = '' } = {}) {
  return content
    .replace(/\{user\}/g,     user)
    .replace(/\{staff\}/g,    staff)
    .replace(/\{type\}/g,     type)
    .replace(/\{priority\}/g, priority);
}

module.exports = { getAllSnippets, getSnippet, clearCache, applyPlaceholders };
