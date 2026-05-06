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
