# Progress

Status of the madgear.org redesign (Jekyll → Astro). Last updated: 2026-10-02.

## Live

- **Site:** https://madgear.org, deployed from `master` via GitHub Actions (Pages build type: workflow)
- **HTTPS:** enforced (http → 301 → https), certificate approved for madgear.org
- **Rebuild:** on every push to `master`, every 30 minutes (cron) and manually via *Actions → Deploy → Run workflow*

## Done

### Site
- [x] Astro static site, old `/x.html` URLs kept (`build.format: 'file'`)
- [x] Biker-gang look: logo red + designer teal, Anton/Inter, real logos (full, mark, text) from `Finals03-colors.ai`
- [x] Favicons and apple-touch-icon from the logo mark
- [x] Startseite: hero "Fighting Game *Locals*", section explaining what a local is (including just chilling with people who love fighting games), sessions, streams, Clubhaus, prices, Anfahrt, Kontakt
- [x] Pages: Termine, Anfahrt (with carpool tip FFM City / Wiesbaden / Mainz), Tickets (PayPal, weekend ticket removed), Clubregeln, Die Gang (5 Stamm members), AGB, Impressum
- [x] All wording in Markdown under `src/content/` and `src/pages/*.md` (see README)
- [x] Contact email: kontakt@madgear.org
- [x] Hero shows 魔奴義亜 with the reading `[MA-DO-GI-A]`, T-shirt style (`site.kanjiReading`)
- [x] Merch shop link (https://madgear.myspreadshop.de/): header menu "Merch", footer, and a button in the prices section (`site.links.shop`)

### Merch
- [x] Shop: Spreadshop, linked from the site (see above)
- [ ] T-shirt design 魔奴義亜 `[MA-DO-GI-A]` dictionary print: rough draft in `merch/`, being iterated in a separate chat. `sh merch/export.sh` turns the source into the print files (outlined SVG + PDF) and a preview

### "Is it actually open?"
- [x] Status card: *Clubhaus offen* / *Heute · in X* / *Nächste Session* / *Clubhaus zu*, recomputed in the browser every minute
- [x] Page re-fetches `/feed.json` every 5 minutes; "Stand: vor X" freshness line
- [x] Warning when data is older than 2 days
- [x] Copy: no sign-up needed, just come by; Discord is optional
- [x] Termine capped at the next 5

### Data feeds (`scripts/fetch-feeds.mjs`)
- [x] Google Calendar ICS (incl. recurring sessions, hides `blocked…` entries)
- [x] Discord member/online counts (invite API, no token)
- [x] Twitch: live status, recent VODs, schedule (client credentials)
- [x] YouTube: latest videos (RSS) + live detection
- [x] Videos older than 180 days hidden; "Letzter Stream" from newest of Twitch/YouTube
- [x] Fallback to the previous live `feed.json` if a source fails
- [x] Secrets in `.env` (local, git-ignored) and GitHub repo secrets: `TWITCH_CLIENT_ID`, `TWITCH_CLIENT_SECRET`

### Google Calendar → Discord events (`scripts/sync-discord-events.mjs`)
- [x] Script written and tested against a mocked Discord API
- [x] Creates events with cover image for the next 5 sessions, using the calendar entry's title + description
- [x] Updates existing bot events when title/description/time/location change in the calendar; moved sessions keep their Discord event
- [x] Description line breaks (lost in Google's ICS) restored after punctuation (except commas) and around links
- [x] Only edits/deletes events the bot created; never deletes on an empty calendar
- [x] `SYNC_DRY_RUN=1` preview mode
- [x] Wired into the deploy workflow (skipped until a token exists)

## Open

- [ ] **Discord bot** (deferred). Until then, Discord events are created by hand.
  1. Discord Developer Portal → New Application → Bot → copy token
  2. Invite the bot with permissions *View Channels*, *Create Events*, *Manage Events*
  3. Add repo secret `DISCORD_BOT_TOKEN`
  4. Test locally with `SYNC_DRY_RUN=1`, then let the cron take over
  - Note: manually created Discord events don't appear on the site until the bot token is set; the Google Calendar is the source of truth for the site.

## Ideas / nice to have

- [ ] Replace `public/favicon.ico` with the new logo mark
- [x] GitHub Actions bumped to checkout v7, setup-node v7, upload-pages-artifact v5, deploy-pages v5 (Node 24)
- [x] 60-day cron shutoff: `keepalive` job re-enables the workflow on every scheduled run. If updates ever stop anyway, the stale warning on the site shows it; re-enable in the Actions tab
- [x] Feed fetch retries on Discord 429 (the sync step right before it used up the rate limit, so Discord events fell back to stale data)
- [x] Cron moved to `7,37 * * * *` (GitHub delays :00/:30 runs the most; runs were 4–6 h apart on 2026-10-03)
- [x] External cron (cron-job.org) calls `workflow_dispatch` every 30 minutes (set up 2026-10-04, fine-grained token: renew before it expires). Steps in README → *Reliable 30-minute updates*
