# Security Audit — Trophi.gg Discord Bot

**Date:** 2026-05-06
**Scope:** All bot code, configuration, and runtime behavior on `main`.
**Result:** 2 real findings + 2 hardening opportunities — **all fixed.**

---

## Methodology

Each external-facing surface of the bot was enumerated and tested with adversarial inputs:

1. Slash commands (input via `interaction.options`)
2. Modal submissions (input via `interaction.fields`)
3. Forum thread creation (input via `thread.name`, `thread.appliedTags`, `thread.ownerId`)
4. Guild member join/leave (input via `member.user.username`, `member.user.tag`)
5. Configuration files (`config.json`, `restart.json`)
6. Third-party error messages (from `discord.js`, `undici`)
7. Process-level events (uncaught exceptions, signals)
8. File-system access paths (loader, restart marker)

---

## Findings

### 🟥 H1 — Token leakage in error logs *(High)*

**Location:** `src/utils/logger.js`, `index.js` global handlers, `interactionCreate.js` catch blocks.

**Issue:** Discord library errors can include the `Authorization: Bot <token>` header verbatim in their `.message` field. The previous logger forwarded `err.message` straight to console, the `#auto-log` channel, and Discord error embeds — meaning an unhandled REST error could publish the bot token to a Discord channel where staff (or worse, public users via a misconfigured channel) could read it.

**Repro:**
```js
const err = new Error('Request failed: Authorization=Bot MTIzNDU2.fakeToken123.xyz_abc-def');
logger.error('TEST', err.message); // → Token visible in #auto-log embed
```

**Fix:**
- New utility `src/utils/safeText.js` exports `scrubSecrets(text)` and `safeErrorMessage(err)` which redact:
  - Three-segment Discord token shapes (`xxx.yyy.zzz` with appropriate lengths)
  - `Bot <token>` literals
  - `Authorization: ...` and `Authorization=...` headers
  - Generic `secret`/`token`/`api_key` assignments
- `logger.send()` now passes every message through `scrubSecrets()` before console + channel output.
- All global handlers (`error`, `warn`, `unhandledRejection`, `uncaughtException`) and command-level catch blocks now use `safeErrorMessage(err)`.
- REST registration errors (which carry the auth header) are scrubbed before printing.

---

### 🟥 H2 — Markdown link injection in audit logs *(High)*

**Location:** `src/events/threadCreate.js`, `src/events/guildMemberAdd.js`, `src/events/guildMemberRemove.js`.

**Issue:** User-controlled strings (`thread.name`, `member.user.username`, `member.user.tag`) were inserted raw into embed `.description` and `.title` fields in `#auto-log`. Discord embed descriptions render full markdown — including `[link text](url)` — so a malicious member could:

```
Username: Trophi Mod [click for free trophies](https://evil.example/phishing)
```

…and the audit log would render a clickable phishing link disguised as an admin notification. This is especially dangerous because staff trust `#auto-log` content.

**Repro:**
- Set username to `[click here](https://evil.tld)`
- Join the server
- The welcome embed and `#auto-log` join entry both render the link as clickable

**Fix:**
- New utility `safeUserText(input, maxLen)` strips zero-width characters and bidirectional override marks, then escapes Discord markdown (`* _ ~ ` | > # - [ ] ( ) \`).
- All callers wrapping `thread.name`, `forum.name`, applied-tag names, `user.tag`, `user.username` now go through `safeUserText`.
- Logger embed values are length-capped per Discord limits (256 for names, 1024 for fields, 4000 for descriptions).
- All audit-log embed sends now declare `allowedMentions: { parse: [] }` defense-in-depth (embeds technically can't ping, but content alongside them can).

---

### 🟧 M1 — Information disclosure via `/tags` and `/status` *(Medium)*

**Location:** `src/commands/utility/tags.js`, `src/commands/utility/status.js`.

**Issue:**
- `/tags` was public and printed the user IDs of staff members configured in `tagMentions`. Combined with normal Discord profile lookup, this lets an attacker enumerate moderator account IDs from any channel.
- `/status` was public and exposed runtime versions (Node.js, discord.js), memory footprint, and total user count. If a CVE drops in the next discord.js minor, attackers can immediately identify vulnerable deployments.

**Fix:**
- `/tags`: now requires `ManageGuild` permission (default + runtime re-check) and replies ephemerally so the output stays with the requester.
- `/status`: ephemeral by default; the public reply only shows online status, uptime, and latency. Memory, server/user counts, and runtime versions are gated behind the `Administrator` permission.

---

### 🟧 M2 — Missing guild-context guards on sensitive commands *(Medium)*

**Location:** `src/commands/utility/restart.js`, `src/commands/staff/feedback.js`.

**Issue:** Commands relied on `interaction.member.permissions.has(...)`. If a slash command is somehow invokable in a DM context (e.g. global registration mistake, future refactor), `interaction.member` is `null` and the permission check would crash, potentially short-circuiting around the admin gate. Defense-in-depth was missing.

**Fix:**
- `/restart` now requires `interaction.inGuild()` AND `interaction.member?.permissions?.has(Administrator)`.
- `/tags` requires `interaction.inGuild()` AND `ManageGuild`.
- `/feedback` already routes everything through guild-scoped channels, but the new guild check in `interactionCreate.js` rejects foreign-guild interactions before they reach any command handler.

---

## Hardening that was already in place

- ✅ `.env` is gitignored; only public IDs (`clientId`, `guildId`) are committed.
- ✅ `MessageContent` privileged intent is **not** requested (least privilege).
- ✅ Guild-scoping check rejects interactions from foreign guilds.
- ✅ `/restart` uses `spawn()` with `shell: false` and an arg array — no shell interpolation.
- ✅ `restart.json` only stores a channel ID; never user input.
- ✅ Cooldown map auto-cleans every 5 minutes.
- ✅ Login retry uses capped exponential backoff (1s → 5min cap).
- ✅ `setDefaultMemberPermissions(Administrator)` on `/restart` + runtime re-check.
- ✅ `process.on('SIGTERM' | 'SIGINT')` graceful shutdown.
- ✅ `npm audit` reports zero vulnerabilities.

---

## Tests run

| # | Vector | Result |
|---|---|---|
| 1 | Error message containing fake token | ✅ Scrubbed by `scrubSecrets()` |
| 2 | Thread name `Trophy bug [phishing](https://evil/)` | ✅ Escaped; renders as literal text |
| 3 | Username with `\`\`\`` and zero-width chars | ✅ Stripped + escaped |
| 4 | Empty/whitespace-only feedback fields | ✅ Rejected by trim+minLength |
| 5 | Snowflake injection (`123…; rm -rf /`, `${PATH}`, etc.) | ✅ Rejected by `/^\d{17,20}$/` |
| 6 | Modal customId with extra colons (`feedback:bug:extra`) | ✅ Prefix-only dispatch, ignored remainder |
| 7 | Modal with unknown prefix (`evil:bypass`) | ✅ No handler, silently dropped |
| 8 | Foreign-guild interaction | ✅ Blocked + logged in `SECURITY` scope |
| 9 | `/restart` in DM context | ✅ `inGuild()` check rejects |
| 10 | `npm audit` | ✅ 0 vulnerabilities |
| 11 | Thread `tagMentions` config with malformed user ID | ✅ Filtered by snowflake regex before mention |

---

## Recommendations for ongoing security

1. **Rotate the token now** if you ever ran the bot in dev with `console.log(client.token)` or similar, even briefly.
2. **Run `npm audit` weekly** — the audit fix in `c397193` cleared 4 vulns; new ones will appear.
3. **Don't add the `MessageContent` intent** unless you implement a feature that genuinely requires reading non-prefixed message content.
4. **Keep `#auto-log` private to staff** — it surfaces user IDs and join timestamps.
5. **Avoid adding `try { ... } catch (e) { interaction.reply(e.message) }`** patterns. Always go through `replyError()` so user-facing errors stay generic.
6. **When integrating the future Trophi API**, do not trust API responses as safe HTML/markdown — wrap any user-derived strings (game names, achievement descriptions) through `safeUserText()` before showing them in embeds.
