const fs = require('fs');
const path = require('path');

function walkJsFiles(dir) {
  const out = [];
  if (!fs.existsSync(dir)) return out;

  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      out.push(...walkJsFiles(full));
    } else if (entry.isFile() && entry.name.endsWith('.js')) {
      out.push(full);
    }
  }
  return out;
}

/**
 * Lookup table for modal handlers — O(1) prefix dispatch.
 * Commands declare `modalIdPrefix: 'feedback'` and `handleModal(...)`.
 * If a command uses `customId.startsWith(prefix)` patterns, we hash it once at load.
 */
function buildModalHandlerRegistry(registry) {
  const byPrefix = new Map();

  for (const cmd of registry.values()) {
    if (typeof cmd.handleModal !== 'function') continue;

    const prefix = cmd.modalIdPrefix || cmd.data?.name;
    if (!prefix) continue;

    if (byPrefix.has(prefix)) {
      console.warn(`[LOADER] Modal prefix collision: "${prefix}" — only the first registration wins.`);
      continue;
    }
    byPrefix.set(prefix, cmd.handleModal.bind(cmd));
  }

  return {
    /** Find handler for a given customId. customId convention: "<prefix>:<...>" */
    find(customId) {
      if (!customId) return null;
      const prefix = customId.split(':')[0];
      return byPrefix.get(prefix) || null;
    },
    size: byPrefix.size
  };
}

function loadCommands(commandsDir) {
  const registry = new Map();
  const files = walkJsFiles(commandsDir);

  for (const file of files) {
    const cmd = require(file);
    if (!cmd?.data?.name) {
      console.warn(`[LOADER] Skipping ${file} — missing data.name`);
      continue;
    }

    if (!cmd.group) {
      const rel = path.relative(commandsDir, file);
      const group = rel.split(path.sep)[0];
      cmd.group = group;
    }

    registry.set(cmd.data.name, cmd);
    console.log(`[LOADER] Loaded command: /${cmd.data.name} (${cmd.group})`);
  }

  return registry;
}

function loadEvents(client, eventsDir, ctx) {
  // Build modal handler registry once and inject it into ctx so events can use it.
  ctx.modalHandlers = buildModalHandlerRegistry(ctx.registry);
  if (ctx.modalHandlers.size > 0) {
    console.log(`[LOADER] Indexed ${ctx.modalHandlers.size} modal handler(s)`);
  }

  const files = walkJsFiles(eventsDir);

  for (const file of files) {
    const ev = require(file);
    if (!ev?.name || typeof ev.execute !== 'function') {
      console.warn(`[LOADER] Skipping ${file} — invalid event`);
      continue;
    }

    const fn = (...args) => ev.execute(...args, ctx);

    if (ev.once) {
      client.once(ev.name, fn);
    } else {
      client.on(ev.name, fn);
    }

    console.log(`[LOADER] Loaded event: ${ev.name}${ev.once ? ' (once)' : ''}`);
  }
}

module.exports = { loadCommands, loadEvents };
