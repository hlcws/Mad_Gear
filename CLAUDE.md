# MadGearFFM — madgear.org

State: `progress.md`. Where each piece of wording lives: `README.md`. Merch designs: private repo `hlcws/mad_gear_merch`. Stream overlays, scoreboard, LED equipment and their specs: private repo `hlcws/mad_gear_stream`.

- The club name is **MadGearFFM**: one word, no spaces, everywhere user-facing.
- Homepage prose is often edited in a parallel session: commit only the files your task touched.
- A push to `master` deploys madgear.org (GitHub Actions, also every 30 min by cron). The pre-commit hook runs `npm run check` (`astro build`).
- `public/logo-mark.svg` is copied into the merch repo (`shared/logos/`), and `public/logo-*.svg` into the stream repo (`stream/overlays/assets/`): copy them there again when they change.
- `public/feed.json` (built by `scripts/fetch-feeds.mjs`) is read by the stream repo: keep its format (events, `signups`) in step with `hlcws/mad_gear_stream`.

## Pending manual steps (from the 2026-10-30 cloud session)

Raise these with the user at the start of a session on their machine; delete each line once done, and this section when empty.

- [ ] **Stream PC (and every machine with an old checkout):** `stream/` and `equipment/` moved to the private repo `hlcws/mad_gear_stream` (same paths inside it). Clone it, move the ignored files worth keeping from the old `stream/` (`state.json`, `players.json`, `players/`) into the clone's `stream/`, then delete the old `stream/` and `equipment/` folders. Its own pending steps are in its `CLAUDE.md`.
- [ ] **Every machine with an old checkout:** `merch/` moved to the private repo `hlcws/mad_gear_merch` (repo root = old `merch/`). If a `merch/` folder is still here after pulling, it holds untracked or ignored files (e.g. `*/out/*-print.*`): move what's worth keeping into a clone of `mad_gear_merch`, then delete the folder.
- [ ] **Delete branches** `redesign` and `stream-overlays` (both fully on `master`; the cloud session was not allowed to delete them): `git push origin --delete redesign stream-overlays`
