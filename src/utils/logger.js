const { EmbedBuilder } = require('discord.js');
const config = require('../../config.json');

const LEVELS = {
  info: { color: 0x5865F2, emoji: 'ℹ️' },
  success: { color: 0x00FF00, emoji: '✅' },
  warn: { color: 0xFFA500, emoji: '⚠️' },
  error: { color: 0xFF0000, emoji: '🛑' },
  event: { color: 0x9B59B6, emoji: '📡' }
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

async function send(level, scope, message, fields = []) {
  consoleLog(level, scope, message);

  const channelId = config.channels?.autoLog;
  if (!clientRef || !channelId) return;

  try {
    const channel = await clientRef.channels.fetch(channelId).catch(() => null);
    if (!channel || !channel.isTextBased()) return;

    const meta = LEVELS[level] ?? LEVELS.info;
    const embed = new EmbedBuilder()
      .setColor(meta.color)
      .setTitle(`${meta.emoji} ${scope || 'Log'}`)
      .setDescription(message?.slice(0, 4000) ?? '_(no message)_')
      .setTimestamp();

    if (fields.length) embed.addFields(fields.slice(0, 25));

    await channel.send({ embeds: [embed] }).catch(() => {});
  } catch (err) {
    console.error('[LOGGER ERROR]', err);
  }
}

module.exports = {
  init,
  info: (scope, msg, fields) => send('info', scope, msg, fields),
  success: (scope, msg, fields) => send('success', scope, msg, fields),
  warn: (scope, msg, fields) => send('warn', scope, msg, fields),
  error: (scope, msg, fields) => send('error', scope, msg, fields),
  event: (scope, msg, fields) => send('event', scope, msg, fields)
};
