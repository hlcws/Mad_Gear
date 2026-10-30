# Progress

Status of the madgear.org redesign (Jekyll → Astro). Last updated: 2026-10-30.

## Live

- **Site:** https://madgear.org, deployed from `master` via GitHub Actions (Pages build type: workflow)
- **HTTPS:** enforced (http → 301 → https), certificate approved for madgear.org
- **Rebuild:** on every push to `master`, every 30 minutes (cron) and manually via *Actions → Deploy → Run workflow*

## Done

### Site
- [x] Astro static site, old `/x.html` URLs kept (`build.format: 'file'`)
- [x] Biker-gang look: logo red + designer teal, Anton/Inter, real logos (full, mark, text) from `Finals03-colors.ai`
- [x] Favicons and apple-touch-icon from the logo mark
- [x] Startseite: hero "MadGearFFM / Fighting Game *Locals*" (club name from `site.name`), section explaining what a local is (including just chilling with people who love fighting games), sessions, streams, location, prices, Anfahrt, Kontakt
- [x] Pages: Termine, Anfahrt (with carpool tip FFM City / Wiesbaden / Mainz), Tickets (PayPal, weekend ticket removed), Clubregeln, Die Gang (5 Stamm members), AGB, Impressum
- [x] All wording in Markdown under `src/content/` and `src/pages/*.md` (see README)
- [x] Contact email: kontakt@madgear.org
- [x] Hero shows 魔奴義亜 with the reading `[MA-DO-GI-A]`, T-shirt style (`site.kanjiReading`)
- [x] Merch shop link (https://madgear.myspreadshop.de/): header menu "Merch", footer, and a button in the prices section (`site.links.shop`)
- [x] Wording unified: "Club" in text (*Club offen/zu*, "aus dem Club"), "Location" in nav and section label; no "Clubhaus" left
- [x] Location photos: `club1`–`3.jpg` (picked from the originals in `public/photos/inc/`, which stay uncommitted); hero background stays `location1.jpg` (cleanest shot)
- [x] "Was gespielt wird": bubbles sized by `tier` in `5-clubhaus.md` (1 = SF6, KOF XI; 2 = Avatar, Guilty Gear, Tokon; 3 = rest). Popularity only implied by order and size, names stay plain text for SEO
- [x] No horizontal scroll on phones (event list overflowed by ~45 px; grid columns now shrink, long text wraps)

### Merch
- [x] Shop: Spreadshop, linked from the site (see above)
- Designs moved to the private repo `hlcws/mad_gear_merch` on 2026-10-30 (status in its `README.md`)

### "Is it actually open?"
- [x] Status card: *Club offen* / *Heute · in X* / *Nächste Session* / *Club zu*, recomputed in the browser every minute
- [x] Page re-fetches `/feed.json` every 5 minutes; "Stand: vor X" freshness line
- [x] Warning when data is older than 2 days
- [x] Copy: no sign-up needed, just come by; Discord is optional
- [x] Buttons: "Wie komme ich hin?" (→ Anfahrt) next to "Wer kommt noch?" (→ Discord event)
- [x] Live player (Twitch, else YouTube) also follows the 5-minute refresh: appears/disappears without reload, a running player is never restarted (`renderLive` in `src/lib/render.js`). Live status itself comes from the build, so worst case ~35 min after going live
- [x] Stream sections: "Letzte Streams auf Twitch / auf YouTube", buttons "Alle auf Twitch / auf YouTube"
- [x] Termine capped at the next 5
- [x] Session card shows "Die Angemeldeten spielen": games of the Discord sign-ups, from their roles (`feeds.gameRoles` allowlist, unlisted roles ignored). Only represented games; shade = share of sign-ups (3 levels), order shuffled once per page load (no ranking). Spec: `specs/session-game-heatmap.md`. Gotcha: a new game role in Discord shows nowhere until it's added to `gameRoles`

### Data feeds (`scripts/fetch-feeds.mjs`)
- [x] Google Calendar ICS (incl. recurring sessions, hides `blocked…` entries)
- [x] Discord member/online counts (invite API, no token)
- [x] Twitch: live status, recent VODs, schedule (client credentials)
- [x] YouTube: latest videos (RSS) + live detection
- [x] Videos older than 180 days hidden; "Letzter Stream" from newest of Twitch/YouTube
- [x] Fallback to the previous live `feed.json` if a source fails
- [x] Secrets in `.env` (local, git-ignored) and GitHub repo secrets: `TWITCH_CLIENT_ID`, `TWITCH_CLIENT_SECRET`

### Google Calendar → Discord events (`scripts/sync-discord-events.mjs`)
- [x] Discord bot set up (application, invite with *View Channels* / *Create Events* / *Manage Events*, repo secret `DISCORD_BOT_TOKEN`); sync runs in the deploy workflow
- [x] Script written and tested against a mocked Discord API
- [x] Creates events with cover image for the next 5 sessions, using the calendar entry's title + description
- [x] Updates existing bot events when title/description/time/location change in the calendar; moved sessions keep their Discord event
- [x] Description line breaks (lost in Google's ICS) restored after punctuation (except commas) and around links
- [x] Only edits/deletes events the bot created; never deletes on an empty calendar
- [x] `SYNC_DRY_RUN=1` preview mode
- [x] Wired into the deploy workflow (skipped until a token exists)
- [x] `#kalender` posts: one bot message per upcoming session (title, Discord timestamps, location, event link), edited in place, deleted at 06:00 Berlin the morning after or when its event disappears. Keyed by the event ID in the link, so no state. Spec: `specs/kalender-posts.md`. Verified 2026-10-23: 5 posts created, rerun idempotent, stale post re-edited. Open/unverified: event card unfurl in the client, cancel path, first real morning-after deletion (2026-10-25 06:00)
- Gotcha: there are two `#kalender` channels; the live one is `593081981101670413`, the other sits in `archive`

### Equipment & Club Lighting (`equipment/`)
- [x] Bluetooth Low Energy (BLE) control for Zengge / Magic Hue BT-SPI addressable LED controllers (`bt_spi.py`, `protocol.py`)
- [x] Tested against real hardware: `LEDnetWF0200A346BE98` (`08:65:F0:46:BE:98`, model `0xA3`, WS2812B strips)
- [x] Implemented 8-byte transport wrapping, A3+ IC configuration, 0x3B HSV color framing, power, and live status queries
- [x] Saved defaults in `equipment/config.json` so commands don't require passing `--address`
- [x] 17 automated tests in `equipment/tests/` covering framing, checksum, HSV packing, and CLI defaults
- [ ] Next: wire an `/api/light` hook into `stream/server.mjs` so scenes and match state drive the lights (e.g. red during the last match)

## Open

- Nothing site-side. Merch status: `hlcws/mad_gear_merch`
- [ ] Scoreboard player picker: Discord sign-ups + recent players as chips, player images, score hidden by default. Spec: `specs/scoreboard-player-picker.md`

## Ideas / nice to have

- [x] `public/favicon.ico` (16/32/48 px) rebuilt from the logo mark (`public/logos/madgear-mark-512.png`)
- [x] GitHub Actions bumped to checkout v7, setup-node v7, upload-pages-artifact v5, deploy-pages v5 (Node 24)
- [x] 60-day cron shutoff: `keepalive` job re-enables the workflow on every scheduled run. If updates ever stop anyway, the stale warning on the site shows it; re-enable in the Actions tab
- [x] Feed fetch retries on Discord 429 (the sync step right before it used up the rate limit, so Discord events fell back to stale data)
- [x] Cron moved to `7,37 * * * *` (GitHub delays :00/:30 runs the most; runs were 4–6 h apart on 2026-10-03)
- [x] External cron (cron-job.org) calls `workflow_dispatch` every 30 minutes (set up 2026-10-04, fine-grained token: renew before it expires). Steps in README → *Reliable 30-minute updates*
