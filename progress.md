# Progress

Status of the madgear.org redesign (Jekyll → Astro). Last updated: 2026-10-04.

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
- [ ] T-shirt design 魔奴義亜 `[MA-DO-GI-A]` dictionary print, work in progress (see **Handoff: T-shirt** below)

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
- [x] Discord bot set up (application, invite with *View Channels* / *Create Events* / *Manage Events*, repo secret `DISCORD_BOT_TOKEN`); sync runs in the deploy workflow
- [x] Script written and tested against a mocked Discord API
- [x] Creates events with cover image for the next 5 sessions, using the calendar entry's title + description
- [x] Updates existing bot events when title/description/time/location change in the calendar; moved sessions keep their Discord event
- [x] Description line breaks (lost in Google's ICS) restored after punctuation (except commas) and around links
- [x] Only edits/deletes events the bot created; never deletes on an empty calendar
- [x] `SYNC_DRY_RUN=1` preview mode
- [x] Wired into the deploy workflow (skipped until a token exists)

## Open

- [ ] T-shirt (see handoff below)

## Handoff: T-shirt (as of 2026-10-04)

Work moved to another computer. Everything below is committed on branch `stream-overlays` (not `master`).

**Files in `merch/`**
- `shirt-madogia.svg`: the source. Header = `public/logo-text.svg`, then 魔奴義亜 + `[MA-DO-GI-A]`, then one row per kanji (reading + meaning), footer "FRANKFURT · RHEIN-MAIN / FIGHTING GAME LOCALS"
- `export.sh`: `sh merch/export.sh` → `*-print.svg`, `*-print.pdf` (git-ignored, regenerate) and `shirt-madogia-preview.png`. Needs Inkscape (path via `INKSCAPE=`) + Node. Inlines linked **SVG** logos with per-copy id prefixes so the same logo can appear twice
- `brush-kanji.py`: replaces `<text class="kanji">` with outlines from a font file (needs `pip install fonttools`): `python brush-kanji.py in.svg out.svg fonts/YujiBoku-Regular.ttf`
- `fonts/`: Yuji Boku / Syuku / Mai (OFL, `fonts/OFL.txt`); `compare-brush.png` compares them with the current Yu Gothic Bold
- `demon.jpg`, `guy.jpg`: caricature mockups; `demon-cut.png`, `guy-cut.png`: same with the black knocked out, placed in the right column of the 魔 and 奴 rows. 義 row uses `public/logo-mark.svg`. 亜 row has no picture
- `ref-sodom-mark.png`: reference image; `Finals03-colors.ai`: original logo source

**Latest changes (this round)**
- Header logo swapped from logo mark to logo text
- Meanings shortened: DEMON / ROUGH GUY / HONOUR / ASIA
- Footer reworded (FRANKFURT · RHEIN-MAIN on top)
- Caricature column added

**Open decisions / next steps**
1. Kanji font: keep Yu Gothic Bold or switch to a Yuji brush font. `brush-kanji.py` is not wired into `export.sh` yet; if a brush font wins, add it as a step before Inkscape
2. Caricatures: `export.sh` only inlines `.svg` images, so the PNGs stay **linked** in the print SVG/PDF. Before sending to print: vectorise them (preferred, print is spot colour) or embed them as base64. The PNGs are 1.5 MB each
3. Caricatures look like recognisable game characters: check that's OK for a shirt that is sold on Spreadshop, or redraw as original characters
4. 亜 row: picture or leave empty
5. Check print specs on Spreadshop (max print area, colours, min line width), then upload `shirt-madogia-print.svg`

## Ideas / nice to have

- [ ] Replace `public/favicon.ico` with the new logo mark
- [x] GitHub Actions bumped to checkout v7, setup-node v7, upload-pages-artifact v5, deploy-pages v5 (Node 24)
- [x] 60-day cron shutoff: `keepalive` job re-enables the workflow on every scheduled run. If updates ever stop anyway, the stale warning on the site shows it; re-enable in the Actions tab
- [ ] Optional: external cron (e.g. cron-job.org) calling `workflow_dispatch` if GitHub's schedule delays become a problem
