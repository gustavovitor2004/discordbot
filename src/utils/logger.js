const { EmbedBuilder } = require('discord.js');
const config = require('../../config.json');
const { scrubSecrets } = require('./safeText');

const LEVELS = {
  info:    { color: 0x5865F2, emoji: 'ℹ️' },
  success: { color: 0x00FF00, emoji: '✅' },
  warn:    { color: 0xFFA500, emoji: '⚠️' },
  error:   { color: 0xFF0000, emoji: '🛑' },
  event:   { color: 0x9B59B6, emoji: '📡' }
};

let clientRef = null;

function init(client) {
  clientRef = client;
}

function consoleLog(level, scope, message) {
  const tag = `[${level.toUpperCase()}]${scope ? `[${scope}]` : ''}`;
  const fn = level === 'error' ? console.error : level === 'warn' ? console.warn : console.log;
  fn(`${tag} ${message}`);
}

/**
 * Send a log entry to console + (if configured) the audit channel.
 * Always passes the message through scrubSecrets() defense-in-depth so a
 * bot token leaking into an error message never reaches Discord or the file.
 *
 * Note: callers are responsible for escaping user-controlled markdown before
 * passing the message in. Use safeUserText() from utils/safeText.js for that.
 */
async function send(level, scope, message, fields = []) {
  // Scrub potential secrets before anything else.
  const safeMessage = scrubSecrets(String(message ?? ''));

  consoleLog(level, scope, safeMessage);

  const channelId = config.channels?.autoLog;
  if (!clientRef || !channelId) return;

  try {
    const channel = await clientRef.channels.fetch(channelId).catch(() => null);
    if (!channel || !channel.isTextBased()) return;

    const meta = LEVELS[level] ?? LEVELS.info;
    const safeFields = (fields || []).slice(0, 25).map(f => ({
      name: String(f.name ?? '').slice(0, 256),
      value: scrubSecrets(String(f.value ?? '_(empty)_')).slice(0, 1024),
      inline: !!f.inline
    }));

    const embed = new EmbedBuilder()
      .setColor(meta.color)
      .setTitle(`${meta.emoji} ${String(scope || 'Log').slice(0, 256)}`)
      .setDescription(safeMessage.slice(0, 4000) || '_(no message)_')
      .setTimestamp();

    if (safeFields.length) embed.addFields(safeFields);

    await channel.send({
      embeds: [embed],
      // Defense in depth: log embeds may contain rendered user names/IDs;
      // never let any of that resolve into a real ping.
      allowedMentions: { parse: [] }
    }).catch(() => {});
  } catch (err) {
    console.error('[LOGGER ERROR]', err);
  }
}

module.exports = {
  init,
  info:    (scope, msg, fields) => send('info', scope, msg, fields),
  success: (scope, msg, fields) => send('success', scope, msg, fields),
  warn:    (scope, msg, fields) => send('warn', scope, msg, fields),
  error:   (scope, msg, fields) => send('error', scope, msg, fields),
  event:   (scope, msg, fields) => send('event', scope, msg, fields)
};
