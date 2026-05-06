const fs   = require('fs');
const path = require('path');

const SNIPPETS_PATH = path.join(__dirname, '../../config/snippets.jsonc');

let _cache = null;

/**
 * Strips single-line // comments from a JSONC string.
 * Mirrors the approach used by the main config loader.
 */
function stripComments(str) {
  return str
    .split('\n')
    .map(line => {
      // Remove inline // comments that are not inside a string value.
      // Simple heuristic: strip everything after the first // that is
      // not preceded by an odd number of unescaped quotes.
      const stripped = line.replace(/\s*\/\/.*$/, '');
      return stripped;
    })
    .join('\n');
}

/**
 * Loads and validates snippets.jsonc.
 * Returns the parsed snippets array or throws on error.
 * Result is cached in memory; call clearCache() to reload.
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
    parsed = JSON.parse(stripComments(raw));
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

  // Check for duplicate names (case-insensitive)
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

/**
 * Returns a single snippet by name (case-insensitive) or null if not found.
 */
function getSnippet(name) {
  const snippets = loadSnippets();
  return snippets.find(s => s.name.toLowerCase() === name.toLowerCase()) ?? null;
}

/**
 * Returns all snippets.
 */
function getAllSnippets() {
  return loadSnippets();
}

/**
 * Clears the in-memory cache so snippets are reloaded from disk on next access.
 */
function clearCache() {
  _cache = null;
}

/**
 * Replaces all known placeholders in a snippet's content string.
 *
 * @param {string} content     - Raw snippet content
 * @param {Object} vars
 * @param {string} vars.user     - Ticket creator mention, e.g. "<@123456>"
 * @param {string} vars.staff    - Staff member mention, e.g. "<@789012>"
 * @param {string} vars.type     - Ticket type display name
 * @param {string} vars.priority - Current priority label, e.g. "🟡 Medium"
 */
function applyPlaceholders(content, { user = '', staff = '', type = '', priority = '' } = {}) {
  return content
    .replace(/\{user\}/g, user)
    .replace(/\{staff\}/g, staff)
    .replace(/\{type\}/g, type)
    .replace(/\{priority\}/g, priority);
}

module.exports = { loadSnippets, getSnippet, getAllSnippets, clearCache, applyPlaceholders };
