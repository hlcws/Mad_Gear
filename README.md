# MadGearFFM – madgear.org

Static site (Astro) on GitHub Pages. A GitHub Action runs every 30 minutes and:

1. **Syncs Google Calendar → Discord**: makes sure the next 5 calendar sessions exist as Discord events with the calendar entry's title, description, time and location. Changes in the calendar are applied to the existing Discord event (fallback text in `src/site.config.mjs` → `discordSync`).
2. **Fetches** upcoming events (Discord + Google Calendar + Twitch schedule), Discord member counts, Twitch live status/VODs and YouTube uploads.
3. **Builds and deploys** the site.

Whether the venue is "open now" is computed in the visitor's browser from the event times, so it's always correct to the minute. If the data is more than 2 days old, the site says so instead of pretending.

## Editing content

All wording is Markdown. Edit, save, and the local preview updates instantly; on GitHub, every commit redeploys in ~2 minutes.

| What | File |
|---|---|
| Homepage sections, in order | `src/content/start/1-hero.md` … `7-kontakt.md` |
| Prices (homepage + tickets) | `src/content/preise.md` |
| Team members | `src/content/gang.md` |
| Ticket info text | `src/content/tickets.md` |
| Anfahrt, Clubregeln, AGB, Impressum | `src/pages/anfahrt.md`, `regeln.md`, `agb.md`, `impressum.md` |
| Links, address, Discord event template, data sources | `src/site.config.mjs` |
| Photos / logos | `public/photos/`, `public/logo-*.svg` |

How the Markdown files work:
- The part between the `---` lines at the top is settings (title, lists like cards, members, prices). Keep the indentation; if a value contains a `:` wrap it in quotes.
- Everything below the second `---` is normal Markdown text.
- In titles, `*Wort*` turns the word red. In short fields `**fett**` and `[Link](url)` work.
- A line starting with `>` becomes a highlighted tip box.
- Lines starting with `#` inside the top block are comments.

### Planning sessions

Add or delete sessions in the **Google Calendar** (one-off or recurring). Within 30 minutes they show up on the site and as Discord events.
- Cancel one Saturday: delete that single occurrence in Google Calendar. The bot removes its Discord event.
- Title and description of the calendar entry become the Discord event's title and description. Edit them in the calendar (one occurrence or the whole series) and the Discord event is updated on the next run.
- Moving a session to another time moves its Discord event (people who clicked "Interested" stay).
- Entries without a description get the default text from `discordSync.description`.
- Google's calendar feed loses line breaks, so the bot adds one after every punctuation mark except commas, and around links.
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
