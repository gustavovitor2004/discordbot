/**
 * Trophibot — Real-Time Monitor
 * -----------------------------
 * Standalone monitoring program for the Trophibot Discord bot.
 *
 * What it does:
 *   - Connects to Discord with its own bot token (read from .env).
 *   - Tracks live status: WebSocket ping, uptime, guild count, connection state.
 *   - Watches forum thread creation and counts case-sensitive "Site" / "Server"
 *     tag detections.
 *   - Keeps the last 10 events in an in-memory activity log.
 *   - Serves a local web dashboard at http://localhost:PORT (default 3000).
 *   - Pushes live updates to all connected dashboard clients over WebSocket.
 *
 * Designed to run alongside the main bot under PM2:
 *   pm2 start monitor.js --name trophibot-monitor
 *
 * Safety:
 *   - Listens on 127.0.0.1 by default (no exposure on the network).
 *   - Catches unhandledRejection and uncaughtException so PM2 never sees a crash.
 *   - Exponential backoff on login failure (1s -> 5min cap).
 *   - Graceful shutdown on SIGTERM / SIGINT.
 */

'use strict';

require('dotenv').config();

const http = require('http');
const fs = require('fs');
const path = require('path');
const { WebSocketServer } = require('ws');
const {
  Client,
  GatewayIntentBits,
  Partials,
  Events,
  ChannelType
} = require('discord.js');

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

const TOKEN = process.env.DISCORD_TOKEN;
const PORT = parseInt(process.env.PORT || '3000', 10);
const HOST = process.env.HOST || '127.0.0.1';

const ACTIVITY_LOG_MAX = 10;
const SNAPSHOT_INTERVAL_MS = 15_000;   // push ping/uptime updates every 15s
const WS_HEARTBEAT_INTERVAL_MS = 30_000;
const LOGIN_BACKOFF_BASE_MS = 1_000;
const LOGIN_BACKOFF_CAP_MS = 5 * 60_000;

// Forum tags the bot reacts to (CASE-SENSITIVE, exactly as in DISCORD_SERVER.md).
const WATCHED_TAGS = ['Site', 'Server'];

// Static command list shown in the dashboard "Commands" panel.
const COMMANDS = [
  { name: '/ping',    description: 'Check bot latency',                 permission: 'public' },
  { name: '/status',  description: 'Show bot status and metrics',       permission: 'public' },
  { name: '/restart', description: 'Restart the bot via PM2',           permission: 'admin'  },
  { name: '/help',    description: 'List all available slash commands', permission: 'public' }
];

if (!TOKEN) {
  console.error('[FATAL] DISCORD_TOKEN is not set in .env file.');
  process.exit(1);
}

// ---------------------------------------------------------------------------
// State
// ---------------------------------------------------------------------------

/**
 * @typedef {'connecting' | 'online' | 'reconnecting' | 'offline'} BotStatus
 */
const state = {
  /** @type {BotStatus} */
  status: 'connecting',
  /** Time the monitor process started (epoch ms). */
  monitorStartedAt: Date.now(),
  /** Time the Discord client became ready (epoch ms), or null if not connected. */
  connectedAt: null,
  /** Discord username#tag once connected. */
  identity: null,
  /** Last observed WebSocket ping in ms (-1 if unknown). */
  ping: -1,
  /** Number of guilds the bot is in. */
  guildCount: 0,
  /** Total reconnect cycles observed. */
  reconnectCount: 0,
  /** Cumulative alert counters per watched tag. */
  alerts: Object.fromEntries(WATCHED_TAGS.map(t => [t, 0])),
  /** Newest-first ring buffer of activity log entries. */
  activityLog: []
};

let activityIdCounter = 0;

/**
 * Push an event into the activity log and broadcast it to dashboard clients.
 * @param {'info'|'success'|'warn'|'error'|'alert'} level
 * @param {string} message
 */
function pushActivity(level, message) {
  const entry = {
    id: ++activityIdCounter,
    timestamp: Date.now(),
    level,
    message: String(message).slice(0, 500)
  };
  state.activityLog.unshift(entry);
  if (state.activityLog.length > ACTIVITY_LOG_MAX) {
    state.activityLog.length = ACTIVITY_LOG_MAX;
  }
  log(`[${level.toUpperCase()}] ${message}`);
  broadcast({ type: 'event', data: entry });
  broadcast({ type: 'snapshot', data: snapshot() });
}

/** Build a complete state snapshot to send to a dashboard client. */
function snapshot() {
  return {
    status: state.status,
    monitorStartedAt: state.monitorStartedAt,
    connectedAt: state.connectedAt,
    identity: state.identity,
    ping: state.ping,
    guildCount: state.guildCount,
    reconnectCount: state.reconnectCount,
    alerts: { ...state.alerts },
    activityLog: state.activityLog.slice(),
    commands: COMMANDS,
    watchedTags: WATCHED_TAGS,
    serverTime: Date.now()
  };
}

function log(msg) {
  console.log(`[${new Date().toISOString()}] ${msg}`);
}

// ---------------------------------------------------------------------------
// Discord client
// ---------------------------------------------------------------------------

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers
  ],
  partials: [Partials.Channel, Partials.ThreadMember]
});

client.once(Events.ClientReady, () => {
  state.status = 'online';
  state.connectedAt = Date.now();
  state.identity = client.user.tag;
  state.guildCount = client.guilds.cache.size;
  state.ping = client.ws.ping;
  pushActivity('success', `Connected as ${client.user.tag} (watching ${state.guildCount} guild${state.guildCount === 1 ? '' : 's'})`);
});

client.on(Events.ShardReconnecting, (id) => {
  state.status = 'reconnecting';
  state.reconnectCount++;
  pushActivity('warn', `Shard ${id} reconnecting...`);
});

client.on(Events.ShardDisconnect, (event, id) => {
  state.status = 'offline';
  state.connectedAt = null;
  const reason = (event && (event.reason || event.code)) ? `${event.code ?? ''} ${event.reason ?? ''}`.trim() : 'unknown';
  pushActivity('error', `Shard ${id} disconnected: ${reason}`);
});

client.on(Events.ShardResume, (id, replayed) => {
  state.status = 'online';
  state.connectedAt = state.connectedAt || Date.now();
  pushActivity('success', `Shard ${id} resumed (${replayed} event${replayed === 1 ? '' : 's'} replayed)`);
});

client.on(Events.ShardError, (err, id) => {
  pushActivity('error', `Shard ${id} error: ${err?.message || err}`);
});

client.on(Events.GuildCreate, (g) => {
  state.guildCount = client.guilds.cache.size;
  pushActivity('info', `Joined guild: ${g.name}`);
});

client.on(Events.GuildDelete, (g) => {
  state.guildCount = client.guilds.cache.size;
  pushActivity('warn', `Left guild: ${g.name}`);
});

client.on(Events.Error, (err) => {
  pushActivity('error', `Client error: ${err?.message || err}`);
});

client.on(Events.Warn, (warn) => {
  pushActivity('warn', `Client warn: ${warn}`);
});

/**
 * Forum thread watcher — increments alert counters when a thread is created
 * with a tag whose name exactly matches "Site" or "Server" (case-sensitive).
 */
client.on(Events.ThreadCreate, (thread, newlyCreated) => {
  if (!newlyCreated) return;
  if (!thread.parent || thread.parent.type !== ChannelType.GuildForum) return;

  const tagNames = (thread.appliedTags || [])
    .map(id => thread.parent.availableTags.find(t => t.id === id)?.name)
    .filter(Boolean);

  let matched = false;
  for (const tag of WATCHED_TAGS) {
    // Case-sensitive comparison — "site" or "SITE" would NOT match.
    if (tagNames.includes(tag)) {
      state.alerts[tag]++;
      matched = true;
      pushActivity('alert', `🔔 "${tag}" tag detected on new thread: "${thread.name}"`);
    }
  }

  if (!matched && tagNames.length > 0) {
    pushActivity('info', `New thread "${thread.name}" — tags: ${tagNames.join(', ')}`);
  } else if (!matched) {
    pushActivity('info', `New thread "${thread.name}" (no tags)`);
  }
});

// ---------------------------------------------------------------------------
// Login with capped exponential backoff
// ---------------------------------------------------------------------------

let loginAttempt = 0;

function login() {
  client.login(TOKEN).catch((err) => {
    loginAttempt++;
    const delay = Math.min(LOGIN_BACKOFF_BASE_MS * 2 ** (loginAttempt - 1), LOGIN_BACKOFF_CAP_MS);
    state.status = 'offline';
    pushActivity('error', `Login failed (attempt ${loginAttempt}): ${err.message} — retrying in ${Math.round(delay / 1000)}s`);
    setTimeout(login, delay);
  });
}

// On a successful ready, reset the attempt counter so future failures start
// from 1s backoff again.
client.once(Events.ClientReady, () => { loginAttempt = 0; });

// ---------------------------------------------------------------------------
// Periodic snapshot broadcast (ping refresh, etc.)
// ---------------------------------------------------------------------------

setInterval(() => {
  if (client.readyAt && client.ws) {
    state.ping = client.ws.ping;
  }
  broadcast({ type: 'snapshot', data: snapshot() });
}, SNAPSHOT_INTERVAL_MS).unref();

// ---------------------------------------------------------------------------
// HTTP + WebSocket server (dashboard hosting + live updates)
// ---------------------------------------------------------------------------

const dashboardPath = path.join(__dirname, 'dashboard.html');

const server = http.createServer((req, res) => {
  if (req.method !== 'GET') {
    res.writeHead(405, { 'Content-Type': 'text/plain' });
    res.end('Method Not Allowed');
    return;
  }

  if (req.url === '/' || req.url === '/dashboard.html') {
    fs.readFile(dashboardPath, (err, data) => {
      if (err) {
        res.writeHead(500, { 'Content-Type': 'text/plain' });
        res.end('dashboard.html not found alongside monitor.js');
        return;
      }
      res.writeHead(200, {
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'no-store'
      });
      res.end(data);
    });
    return;
  }

  if (req.url === '/api/snapshot') {
    res.writeHead(200, {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-store'
    });
    res.end(JSON.stringify(snapshot()));
    return;
  }

  if (req.url === '/healthz') {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end(`status=${state.status} ping=${state.ping}`);
    return;
  }

  res.writeHead(404, { 'Content-Type': 'text/plain' });
  res.end('Not Found');
});

const wss = new WebSocketServer({ server });
const wsClients = new Set();

wss.on('connection', (ws, req) => {
  wsClients.add(ws);
  ws.isAlive = true;

  log(`Dashboard client connected from ${req.socket.remoteAddress} (total: ${wsClients.size})`);

  // Send the initial snapshot immediately.
  try {
    ws.send(JSON.stringify({ type: 'snapshot', data: snapshot() }));
  } catch (err) {
    log(`Failed to send initial snapshot: ${err.message}`);
  }

  ws.on('pong', () => { ws.isAlive = true; });
  ws.on('close', () => {
    wsClients.delete(ws);
    log(`Dashboard client disconnected (total: ${wsClients.size})`);
  });
  ws.on('error', () => wsClients.delete(ws));
});

// WS heartbeat — kill stale connections that didn't pong back.
const heartbeat = setInterval(() => {
  for (const ws of wsClients) {
    if (!ws.isAlive) {
      try { ws.terminate(); } catch { /* ignore */ }
      wsClients.delete(ws);
      continue;
    }
    ws.isAlive = false;
    try { ws.ping(); } catch { /* ignore */ }
  }
}, WS_HEARTBEAT_INTERVAL_MS);
heartbeat.unref();

function broadcast(payload) {
  if (wsClients.size === 0) return;
  const msg = JSON.stringify(payload);
  for (const ws of wsClients) {
    if (ws.readyState === 1 /* OPEN */) {
      try { ws.send(msg); } catch { /* ignore per-client failure */ }
    }
  }
}

// ---------------------------------------------------------------------------
// Process-level safety nets (PM2 friendly — never let the process die silently)
// ---------------------------------------------------------------------------

process.on('unhandledRejection', (err) => {
  log(`Unhandled rejection: ${err?.message || err}`);
  pushActivity('error', `Unhandled rejection: ${err?.message || err}`);
});

process.on('uncaughtException', (err) => {
  log(`Uncaught exception: ${err?.message || err}`);
  pushActivity('error', `Uncaught exception: ${err?.message || err}`);
});

let shuttingDown = false;
function shutdown(signal) {
  if (shuttingDown) return;
  shuttingDown = true;
  log(`Received ${signal}, shutting down...`);
  for (const ws of wsClients) {
    try { ws.close(1001, 'Server shutting down'); } catch { /* ignore */ }
  }
  server.close();
  client.destroy().finally(() => process.exit(0));

  // Hard exit if cleanup hangs.
  setTimeout(() => process.exit(0), 5000).unref();
}
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

// ---------------------------------------------------------------------------
// Boot
// ---------------------------------------------------------------------------

server.listen(PORT, HOST, () => {
  log(`Monitor dashboard listening on http://${HOST}:${PORT}`);
});

login();
