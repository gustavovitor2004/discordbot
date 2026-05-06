/**
 * safeText — utilities for handling untrusted strings in embeds and logs.
 *
 * Threat model:
 *  - User-supplied strings (thread names, usernames, feedback bodies) can
 *    contain Discord markdown that renders as clickable links, code blocks,
 *    or formatting that misleads viewers (phishing in #auto-log).
 *  - Error messages from third-party libraries (discord.js, undici) can
 *    occasionally include the bot token in an Authorization header.
 *
 * These helpers are defense-in-depth: callers should always wrap user data
 * before putting it into embed fields or log lines.
 */

/**
 * Escape Discord markdown so user input renders as literal text.
 * Covers: * _ ~ ` | > # - [ ] ( ) and zero-width chars used in spoofs.
 */
// Zero-width and direction-spoof characters (ZWSP, ZWNJ, ZWJ, RLO/LRO, BOM, etc.).
// Built via new RegExp() with explicit Unicode escapes for editor-portability.
const ZERO_WIDTH_RE = new RegExp(
  '[\\u200B-\\u200F\\u202A-\\u202E\\u2060-\\u2064\\uFEFF]',
  'gu'
);

function escapeMarkdown(input) {
  if (input === null || input === undefined) return '';
  const str = String(input);
  return str
    // Strip zero-width / direction-override characters that can hide payloads
    // or visually flip URL targets.
    .replace(ZERO_WIDTH_RE, '')
    // Escape Discord markdown control characters.
    .replace(/([\\`*_~|>#\-\[\]\(\)])/g, '\\$1');
}

/**
 * Cap length and escape — for putting user-supplied strings into embed
 * descriptions, fields, or log lines.
 */
function safeUserText(input, maxLen = 500) {
  return escapeMarkdown(String(input ?? '')).slice(0, maxLen);
}

/**
 * Scrub Discord bot tokens (and similar long secrets) out of error messages
 * before they hit logs or Discord channels.
 *
 * Discord bot token format (current): three base64url segments separated by
 * dots, total length ~70-90 chars.
 *
 * Each rule replaces a matched secret with a fixed redaction string.
 * Order matters: match the most specific patterns first.
 */
const SCRUB_RULES = [
  // 1. "Bot xxx.yyy.zzz" literal — most specific.
  {
    re: /Bot\s+[A-Za-z0-9_-]{16,}\.[A-Za-z0-9_-]{4,}\.[A-Za-z0-9_-]{20,}/g,
    replacement: 'Bot [REDACTED]'
  },
  // 2. Bare three-segment Discord-token-shape (xxx.yyy.zzz). Run BEFORE the
  //    generic "token=..." rule so the full token (including all 3 dotted
  //    segments) is collapsed to a single redaction. Length thresholds
  //    avoid common false positives (SemVer, hostnames, file paths).
  {
    re: /[A-Za-z0-9_-]{16,}\.[A-Za-z0-9_-]{4,}\.[A-Za-z0-9_-]{20,}/g,
    replacement: '[REDACTED_TOKEN]'
  },
  // 3. Authorization header / property in any form. Matches the key and the
  //    entire value up to a structural terminator (",", "}", ")", "]", newline).
  //    Handles quoted, unquoted, and JSON-style serialisations.
  {
    re: /['"]?authorization['"]?\s*[:=]\s*[^,}\n)\]]+/gi,
    replacement: 'Authorization: [REDACTED]'
  },
  // 4. Generic "secret"/"token"/"api_key" assignments with a long opaque value.
  {
    re: /(['"]?(?:secret|token|api[_-]?key)['"]?\s*[:=]\s*)['"]?[A-Za-z0-9_\-]{16,}['"]?/gi,
    replacement: '$1[REDACTED]'
  }
];

function scrubSecrets(text) {
  if (text === null || text === undefined) return '';
  let out = String(text);
  for (const { re, replacement } of SCRUB_RULES) {
    out = out.replace(re, replacement);
  }
  return out;
}

/**
 * Sanitize an Error or any thrown value into a string safe for logs/embeds.
 */
function safeErrorMessage(err, maxLen = 1000) {
  const msg = err?.message ?? String(err ?? 'unknown error');
  return scrubSecrets(msg).slice(0, maxLen);
}

module.exports = {
  escapeMarkdown,
  safeUserText,
  scrubSecrets,
  safeErrorMessage
};
