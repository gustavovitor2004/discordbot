const config = require('../../config.json');

const cooldowns = new Map();

function check(userId, commandName, overrideSeconds) {
  const key = `${userId}-${commandName}`;
  const seconds = overrideSeconds ?? config.cooldowns?.[commandName] ?? 3;
  const now = Date.now();

  const expiresAt = cooldowns.get(key);
  if (expiresAt && now < expiresAt) {
    return ((expiresAt - now) / 1000).toFixed(1);
  }

  cooldowns.set(key, now + seconds * 1000);
  return null;
}

setInterval(() => {
  const now = Date.now();
  for (const [key, expiresAt] of cooldowns) {
    if (expiresAt < now) cooldowns.delete(key);
  }
}, 5 * 60 * 1000).unref();

module.exports = { check };
