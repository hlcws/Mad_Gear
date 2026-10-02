# MadGearFFM – madgear.org

Static site (Astro) on GitHub Pages. A GitHub Action runs every 30 minutes and:

1. **Syncs Google Calendar → Discord**: makes sure the next 5 calendar sessions exist as Discord events (template in `src/site.config.mjs` → `discordSync`).
2. **Fetches** upcoming events (Discord + Google Calendar + Twitch schedule), Discord member counts, Twitch live status/VODs and YouTube uploads.
3. **Builds and deploys** the site.

Whether the venue is "open now" is computed in the visitor's browser from the event times, so it's always correct to the minute. If the data is more than 2 days old, the site says so instead of pretending.

## Editing content

| What | Where |
|---|---|
| Links, address, prices, equipment, games, team, Discord event template | `src/site.config.mjs` |
| Rules, AGB, Impressum | `src/pages/regeln.md`, `agb.md`, `impressum.md` (plain Markdown) |
| Directions, tickets | `src/pages/anfahrt.astro`, `tickets.astro` |
| Photos | `public/photos/` |
| Logos (transparent SVG or PNG) | `public/logo-full.svg` (helmet + text, hero & social preview), `public/logo-mark.svg` (helmet only, favicon), `public/logo-text.svg` (text only, header) |

### Planning sessions

Add or delete sessions in the **Google Calendar** (one-off or recurring). Within 30 minutes they show up on the site and as Discord events.
- Cancel one Saturday: delete that single occurrence in Google Calendar. The bot removes its Discord event.
- Special event (tournament, league night): give the calendar entry its own title. It keeps that name in Discord instead of "Casual Session".
- Discord events you create by hand are never touched by the bot and also count as "announced".
- Entries titled "Blocked…" are private and never shown.

## One-time setup

1. **Pages source**: repo → Settings → Pages → Source: **GitHub Actions**. The custom domain stays `madgear.org` (`public/CNAME`).
2. **Discord bot** (for reading and creating events):
   - https://discord.com/developers/applications → New Application → Bot → Reset Token → copy.
   - OAuth2 → URL Generator → scope `bot`, permissions **View Channels**, **Create Events**, **Manage Events** → open the URL and add the bot to the server.
   - Repo → Settings → Secrets and variables → Actions → `DISCORD_BOT_TOKEN`.
3. **Twitch** (live status, VODs, schedule): https://dev.twitch.tv/console/apps → Register (OAuth redirect `http://localhost`, category Website) → secrets `TWITCH_CLIENT_ID`, `TWITCH_CLIENT_SECRET`.
4. **YouTube**: put the channel ID (`UC…`) into `feeds.youtubeChannelId` and the URL into `links.youtube`. No key needed.

Each source is optional; missing secrets just hide that part. Discord member counts and the calendar work without any setup.

Note: GitHub pauses scheduled workflows in repos with no commits for 60 days. If the site shows "Termindaten zuletzt vor … aktualisiert", re-enable the workflow under Actions, or push any commit.

## Local development

```bash
npm install
npm run fetch          # optional: pull live data (set env vars for Discord/Twitch)
npm run dev            # http://localhost:4321
SYNC_DRY_RUN=1 DISCORD_BOT_TOKEN=… node scripts/sync-discord-events.mjs   # preview the Discord sync
```
