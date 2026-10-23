# Game heatmap on the session card

## Goal

The homepage status card (*Club offen* / *Heute · in X* / *Nächste Session*) shows which games the people signed up for that session play, based on their Discord game roles. Only games at least one sign-up has are shown. Tile shade shows relative weight, but the order is random, so there's no ranking. It is meant as a rough indication, not an exact count.

## Verified (probe, 2026-10-23)

- `GET /guilds/{gid}/scheduled-events/{eid}/users?with_member=true` with the existing `DISCORD_BOT_TOKEN` returns the member's role IDs. No privileged intent or new bot permission is needed.
- `GET /guilds/{gid}/roles` returns role names.
- Tomorrow's session (4 sign-ups), allowlisted roles only: sf6 4 · gg 2 · 3s 2 · gbvs 2 · sf4 1 · kof 1 · marvel 1 · mk 1 · bb 1 · exvs 1 · dnf 1 · 2xko 1.

## Decisions (from Q&A)

| Topic | Decision |
|---|---|
| Display | Tiles with shade only, no numbers |
| Order | Random, no ranking. Shuffled once per page load and kept while the tab stays open (survives the 1-minute repaint and 5-minute refresh) |
| Which games | Only games with at least 1 sign-up. No cap, because a cap combined with random order would drop random games |
| Scope | Status card only, not the Termine list |
| Role → game | Explicit allowlist in `site.config.mjs`. Roles not on the list are ignored, umbrella roles included (streetfighter, arcsys, anime, dragonball) |
| Threshold | Shown from 1 sign-up upward |

## Behaviour

**Data (`scripts/fetch-feeds.mjs`, `discordEvents`)**
- Fetch guild roles once. For each scheduled or active event with `user_count > 0`, fetch its users with `with_member=true` (`limit=100`).
- Each member's role names go through the allowlist. A member counts at most once per game, so the two `kof` roles merge into one.
- The event gets `games: [{ name, count }]` in allowlist order, only for games with count ≥ 1. Events with no matched roles get no `games` field. The counts are kept because the shade needs them, so they are visible in the public `feed.json`.
- If the roles or users call fails, the event is still published without `games`. The Discord source as a whole does not fail.

**Allowlist (`site.config.mjs`, `feeds.gameRoles`)**: role name → display name. The order only matters for the build HTML, which the browser re-renders as soon as the page loads:

| Role | Shown as |
|---|---|
| sf6 | SF6 |
| 2xko | 2XKO |
| tekken | Tekken |
| kof | KOF |
| gg | Guilty Gear |
| gbvs | GBVS |
| marvel | Marvel |
| 3s | 3rd Strike |
| sf5 | SF5 |
| sf4 | SF4 |
| bb | BlazBlue |
| dbfz | DBFZ |
| mk | MK |
| exvs | EXVS |
| dnf | DNF Duel |
| fate | Fate |
| Mahjong | Mahjong |

**Render (`renderStatus` in `src/lib/render.js`)**
- Kinds `open`, `soon` and `next` get a tile row below the sub line when `event.games` is non-empty. Kind `none` and calendar-only events (no Discord event) get no row.
- Label: "Die Angemeldeten spielen".
- All represented games, tiles wrap. Shade level from `count / max`: ≥ 0.67 → `heat-3`, ≥ 0.34 → `heat-2`, otherwise `heat-1`. Colours are shades of the logo red, all with readable text contrast.
- Order: `renderStatus` takes an optional ordering. The build passes none (allowlist order). In the browser, `LiveUpdater` gives each game name a random sort key the first time it sees that name and reuses it for the rest of the page's life. Each visit gets a new order, repaints don't reshuffle, and a game added by a refresh slots in at its own random position. The build order gets replaced on the first paint, right at load.
- The row updates on the existing 5-minute browser refresh because `renderStatus` already runs client-side. Data freshness is the same as the rest of the feed (≤ ~35 min).

## Mockup

Current:
```
● Nächste Session
Samstag, 24. Oktober
14:00 – 22:00 Uhr · morgen · Samstag Casuals
[Wie komme ich hin?] [Wer kommt noch?]
Keine Anmeldung nötig, einfach spontan vorbeikommen.
```

Proposed:
```
● Nächste Session
Samstag, 24. Oktober
14:00 – 22:00 Uhr · morgen · Samstag Casuals
Die Angemeldeten spielen
[▓▓ GBVS] [░ MK] [███ SF6] [░ 2XKO] [▓▓ 3rd Strike]
[░ KOF] [░ EXVS] [▓▓ Guilty Gear] [░ BlazBlue]
[░ Marvel] [░ SF4] [░ DNF Duel]
[Wie komme ich hin?] [Wer kommt noch?]
Keine Anmeldung nötig, einfach spontan vorbeikommen.
```
Tiles wrap. The order is different on every visit.

## Acceptance checks

1. `node --env-file=.env scripts/fetch-feeds.mjs`, then the next Discord event in `src/data/feed.json` has `games` with names only from the allowlist, every count ≥ 1, and no count higher than `interested`.
2. A Node one-liner rendering `renderStatus` against fixture feeds shows: (a) the correct `heat-*` classes for counts 4/2/1; (b) the passed ordering is applied, and allowlist order is used without one; (c) no row when `games` is missing or empty; (d) no row for kind `none`.
3. In the browser: the order differs across reloads (5 reloads give ≥ 2 distinct orders), and calling `paint()` again or triggering a refresh keeps it the same.
4. `npm run check` passes.
5. Preview at 375 px and desktop: tiles wrap, no horizontal scroll, text readable on every shade. Screenshot as proof.

## Non-goals

- Termine list, per-person names, numbers in the UI.
- Pagination beyond 100 sign-ups per event.
- Reading roles live in the browser (data stays build-time).

## Effort

**S** (30–60 min, one session). You: nothing beyond pushing to `master` (which deploys). No new secrets or bot permissions.
