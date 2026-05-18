'use strict';

/**
 * monitorClient.js — Fire-and-forget event pusher to the local monitor.
 *
 * The main bot calls pushToMonitor() to send activity entries that appear on
 * the live dashboard. If the monitor isn't running, errors are silently swallowed
 * so the main bot never crashes because of an optional side-process.
 *
 * The monitor only accepts POST /api/event from 127.0.0.1 — no auth token needed.
 */

const http = require('http');

const MONITOR_HOST = '127.0.0.1';
const MONITOR_PORT = parseInt(process.env.MONITOR_PORT || process.env.PORT || '3000', 10);

/**
 * Push an activity entry to the local monitor dashboard.
 * @param {'info'|'success'|'warn'|'error'|'alert'} level
 * @param {string} message
 */
function pushToMonitor(level, message) {
  try {
    const body = JSON.stringify({ level, message: String(message).slice(0, 500) });
    const req = http.request({
      hostname: MONITOR_HOST,
      port: MONITOR_PORT,
      path: '/api/event',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body)
      }
    });
    // Fire-and-forget: ignore all errors so the bot never crashes.
    req.on('error', () => {});
    req.end(body);
  } catch {
    // Never propagate errors from an optional monitoring side-channel.
  }
}

module.exports = { pushToMonitor };
