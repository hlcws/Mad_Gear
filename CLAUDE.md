# MadGearFFM — madgear.org

State: `progress.md`. Where each piece of wording lives: `README.md`. Merch designs: private repo `hlcws/mad_gear_merch`.

- The club name is **MadGearFFM**: one word, no spaces, everywhere user-facing.
- Homepage prose is often edited in a parallel session: commit only the files your task touched.
- A push to `master` deploys madgear.org (GitHub Actions, also every 30 min by cron). The pre-commit hook runs `npm run check` (`astro build`).
- `public/logo-mark.svg` is copied into the merch repo (`shared/logos/`): copy it there again when it changes.
