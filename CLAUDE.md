# MadGearFFM — madgear.org

State: `progress.md`. Where each piece of wording lives: `README.md`. Merch: `merch/README.md`.

- The club name is **MadGearFFM**: one word, no spaces, everywhere user-facing.
- Homepage prose is often edited in a parallel session: commit only the files your task touched (merch work never commits `src/` changes).
- A push to `master` deploys madgear.org (GitHub Actions, also every 30 min by cron). The pre-commit hook runs `npm run check` (`astro build`).
- Merch: no rising-sun motif, 特攻 or 親衛隊 (politically loaded). Keep the correct 義 in 魔奴義亜, not the miswritten one from the Sodom sprite.
