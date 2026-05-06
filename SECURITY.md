# Security Policy

## Reporting a Vulnerability

If you discover a security issue in the Trophi.gg Discord Bot, **please do not open a public GitHub issue.**

Instead, report it privately:

- **Email:** security@trophi.gg *(or open a [private security advisory](https://github.com/gustavovitor2004/discordbot/security/advisories/new) on GitHub)*
- Include a clear description, reproduction steps, and (if possible) a proof of concept.
- We aim to acknowledge reports within **72 hours** and ship a fix or mitigation within **14 days** for high-severity issues.

## Scope

In scope:
- Authentication / authorization bypass
- Privileged command execution by non-admins
- Token / secret leakage paths
- Remote code execution via crafted Discord input
- Bot misuse against the configured guild

Out of scope:
- Issues requiring physical access to the host running the bot
- Discord platform issues (report to Discord)
- Social engineering of moderators

## Security Practices in this Project

- 🔐 **No secrets in git** — all tokens live in `.env` (gitignored). Only public IDs (`clientId`, `guildId`) are committed.
- 🛡️ **Least-privilege intents** — the bot only requests `Guilds` and `GuildMembers`. No message-content access.
- 🚧 **Guild scoping** — all interactions are validated against `config.guildId`; foreign guilds are silently rejected.
- 👮 **Permission re-checks** — admin commands re-verify permissions at runtime, not just via UI hints.
- 🧹 **Input sanitization** — modal inputs are trimmed, length-capped, and never echoed as raw mentions.
- 🚫 **No shell interpolation** — child processes are spawned with arg arrays (`spawn(cmd, [args])`, `shell: false`).
- 🔁 **Safe restart marker** — `restart.json` only stores a channel ID, no user input.
- ⚠️ **Error isolation** — uncaught exceptions and unhandled rejections are caught at the process level and logged without crashing.

## Operational Recommendations

If you self-host this bot:

1. Rotate your `DISCORD_TOKEN` immediately if you suspect leakage (Developer Portal → Bot → Reset Token).
2. Run with a dedicated, non-root user account.
3. Keep dependencies up to date: `npm audit` and `npm update` regularly.
4. Restrict the bot's role permissions in your server to only what it needs.
5. Set the bot's "Public Bot" toggle to **off** in the Developer Portal unless you intend it to be added to other servers.
