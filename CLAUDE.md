# MadGearFFM — madgear.org

State: `progress.md`. Where each piece of wording lives: `README.md`. Merch designs: private repo `hlcws/mad_gear_merch`.

- The club name is **MadGearFFM**: one word, no spaces, everywhere user-facing.
- Homepage prose is often edited in a parallel session: commit only the files your task touched.
- A push to `master` deploys madgear.org (GitHub Actions, also every 30 min by cron). The pre-commit hook runs `npm run check` (`astro build`).
- `public/logo-mark.svg` is copied into the merch repo (`shared/logos/`): copy it there again when it changes.

## Pending manual steps (from the 2026-10-30 cloud session)

Raise these with the user at the start of a session on their machine; delete each line once done, and this section when empty.

- [ ] **Stream PC:** `node stream/render-frames.mjs` (needs Edge/Chrome), then commit + push `stream/overlays/frames/*.png`. `screen.html` now shows the FFM stamp logo, but the Starting/Break/Ending frame PNGs were rendered before that change.
- [ ] **Stream PC:** run `stream/start.bat` once (its `obs\build.mjs` line was broken until 88f0431) and re-import `obs/MadGear.json` in OBS if the scene collection is missing anything.
- [ ] **Every machine with an old checkout:** `merch/` moved to the private repo `hlcws/mad_gear_merch` (repo root = old `merch/`). If a `merch/` folder is still here after pulling, it holds untracked or ignored files (e.g. `*/out/*-print.*`): move what's worth keeping into a clone of `mad_gear_merch`, then delete the folder.
- [ ] **Delete branches** `redesign` and `stream-overlays` (both fully on `master`; the cloud session was not allowed to delete them): `git push origin --delete redesign stream-overlays`
