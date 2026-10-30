# Player picker on the stream scoreboard

## Goal

Setting up a match on stream takes one tap per side instead of typing names. The control panel (`stream/overlays/control.html`) offers today's Discord sign-ups and recently seen players as chips. Free typing still works for walk-ins. Each player can have a square image (main character, inside joke) that shows next to their name on the overlays. The score is hidden by default, because SF6 already shows rounds on screen.

## Decisions (from Q&A)

| Topic | Decision |
|---|---|
| Name source | Public `feed.json`: `signups` on **today's** Discord event only. No bot token on the stream PC; the venue has internet whenever there is a stream |
| Privacy | Only the nicknames, only for today's event. Server members can already see the same list in the public Discord |
| Name shown | Server nickname, else global display name, else username |
| No event today | No sign-up row |
| Score | Hidden by default. A toggle in the panel shows +/−, FT and the scores again, on the panel and on all overlays |
| Chips | One block per side (P1, P2), each with "Signed up today" + "Recent". One tap sets that side |
| Chip of the other side's player | Shown dimmed; tapping it swaps sides |
| Recent | Last 30 names that were picked or typed (picked via a chip or Next, or typed and the field left). People signed up today are not repeated under Recent |
| Remove from Recent | ✕ on the chip, only in edit mode. The player's image is kept |
| Player image | Square PNG, may be transparent, never mirrored. Uploaded in the panel (edit mode), max 2 MB. A non-square image is fitted into the square (`contain`). Stored only on the stream PC. No image means nothing is shown |
| Images keyed by | Name (case-insensitive). A new nickname means uploading the image again |
| Match bar | 96 px image on the outer side of each name. With the score off, the middle cell shows the set title instead of FT |
| Match · Fullscreen | 120 px image standing on the name tab, next to the cam (size "M" from the mockups). The outer ends stay free for SF6's drive gauges |
| On Break | 220 px images either side of the "Current set" line, which reads "ATG vs Maddo" with the score off |
| Cycling | `/api/p1/next`, `/api/p2/next` + hotkeys Ctrl+Alt+Shift+7 / 8. Next only, wraps around |
| Cycle list | Today's sign-ups + names picked or typed today, alphabetical, skipping the player on the other side |
| "Today" | Starts at 06:00 Europe/Berlin, same rule as the `#kalender` posts, so a session running past midnight stays one day |

## Behaviour

### Feed (`scripts/fetch-feeds.mjs`)

- **Session day** = Berlin date of (time − 6 h). An event is *today's* if the session day of its start equals the session day of the build.
- `signupGames` already fetches `/scheduled-events/{id}/users?with_member=true&limit=100` for every event with sign-ups. For today's event, it also collects names: `member.nick ?? user.global_name ?? user.username`, de-duplicated, sorted case-insensitively.
- The event gets `signups: ["ATG", "Maddo", …]`. No sign-ups, or an event that isn't today's, means no `signups` field.
- **Fallback leak:** when the Discord source fails, the build reuses the previous live `feed.json`. Before writing, `signups` is removed from every event that isn't today's, fallback events included. Without this, yesterday's names would stay public.
- The website ignores `signups`; nothing on madgear.org displays them.

### Server (`stream/server.mjs`)

**Pool**
- Fetches `https://madgear.org/feed.json` at start and every 5 minutes. Today's sign-ups are the `signups` of the Discord event whose start falls on the current session day. If there is none, the list is empty.
- If a fetch fails, the last good list is kept. The panel shows the age of the data.

**Player store** (`stream/players.json`, gitignored)
- `recent`: up to 30 names, newest first, de-duplicated case-insensitively. A name moves to the top when it is picked or typed again.
- `today`: `{ day, names }`, emptied when the session day changes.
- `images`: name (lowercase) → file in `stream/players/` (gitignored). The file name is not derived from the player name, so any characters work on Windows. A new upload replaces the old file.

**State** (`state.json`, pushed to all clients over SSE as today)
- New fields:
  - `score` (bool, default `false`)
  - `img1`, `img2`: image URL of the player currently on each side, with a version suffix so OBS reloads it after a new upload; `null` if the player has no image.
- `img1` and `img2` are recomputed whenever a name changes, sides swap or an image is uploaded.

**API** (all GET except the upload, as today)

| Action | URL |
|---|---|
| Pool for the panel | `/api/pool` → `{ signups, recent, today, images, feedAge }` |
| Pick | `/api/pick?side=1&name=ATG`. If that name is on the other side, sides swap instead |
| Commit a typed name | `/api/entered?side=1&name=…`, sent by the panel when the field loses focus (empty names are ignored) |
| Next player | `/api/p1/next`, `/api/p2/next` |
| Score on/off | `/api/score/toggle`, also `/api/set?score=0\|1` |
| Remove from Recent | `/api/recent/remove?name=…` |
| Upload image | `POST /api/image?name=…`, raw PNG body, max 2 MB, otherwise 413 |
| Delete image | `/api/image/delete?name=…` |

- A pick, a Next and a committed typed name all count as *entered*: the name goes to the top of `recent` and into `today`.
- **Next:** the list is today's sign-ups ∪ `today`, sorted alphabetically (case-insensitive), without the other side's player. Next goes to the name after the current one, wrapping around. If the current name isn't in the list, it starts at the first. An empty list does nothing.
- **Hotkeys:** `hotkeys.ps1` registers the number row in order, so appending `p1/next`, `p2/next` to `hotkeyActions` gives Ctrl+Alt+Shift+7 / 8.

### Control panel (`control.html`)

- Status line: `● live · 7 signed up · feed 12 min old`.
- Per side: P-label, image square (⬆ upload badge in edit mode), name input, **Next ▸** button. Below that, "Signed up today (Discord)" chips (Discord-blue outline), then "Recent" chips. Each chip shows a small round thumbnail if the player has an image.
- This side's current player: red chip. The other side's player: dimmed chip; tapping it swaps sides.
- Typing still updates the overlay live (debounced, as today). On blur the name is committed with `/api/entered`.
- Bottom bar: "Show score on stream" switch, "Edit players" switch, set title input.
- Score on: the existing score block (+/−, FT, swap, reset) appears above the player blocks.
- Edit mode: ✕ on Recent chips (not on sign-ups); tapping the image square opens the file picker and uploads for the player currently on that side. If no image exists yet, the square says "no image". There's a delete action for an existing image.
- Chips are at least 44 px high (touch). Works on the tablet, the OBS dock and a phone (blocks stack).

### Overlays

All changes are on the live (`part=live`) layer; frame PNGs stay as they are. Without the server, nothing changes (no names, no images).

- **Score off:** hides `.score` and the FT text on every overlay.
- **`match.html`:** board columns become `96 img · 290 name · 88 middle · 290 name · 96 img`. Middle cell: FT when the score is on, set title when off. The title tab above the board is hidden while the title is in the middle cell.
- **`fullscreen.html`:** with the score off, the name tabs sit flush to the cam. 120 px image on top of each tab, aligned to the cam edge (P1: x 680–800, P2: x 1120–1240, y 900–1020). The red tab above the cam shows only the title when the score is off.
- **`screen.html` (break):** the "Current set" line shows whenever both names are set (today it needs a score > 0). Score off: `Current set · ATG vs Maddo`; on: as today. The line is capped in width and long names are cut with an ellipsis, so it never runs into the images. Images are 220 px at fixed positions: P1 x 160, P2 x 1060, y 630. They stay clear of the session box at y 780.
- Images use `object-fit: contain` in their square. With no image the slot is empty and the layout doesn't shift.

### Files

- Changed:
  - `scripts/fetch-feeds.mjs`
  - `stream/server.mjs`
  - `stream/overlays/control.html`, `match.html`, `fullscreen.html`, `screen.html`
  - `stream/README.md` (hotkey and URL tables, player images)
  - `progress.md`
  - `stream/.gitignore` (already ignores `state.json`): add `players.json`, `players/`
- Not touched: `src/` (the website doesn't use `signups`).

## Mockups

These were reviewed as rendered screenshots (2026-10-30) and are sketched here.

Match bar, score off:
```
[logo] MADGEARFFM        [img] ATG        | CASUALS |        MADDO [img]        socials
```

Match · Fullscreen, score off (M):
```
                       [img]  ┌ CASUALS ┐  [img]
          ATG ──────────────  │   cam   │  ────────────── MADDO
```

Break:
```
                       ON BREAK
                 Back in a few minutes
  [img 220]   CURRENT SET  ATG vs Maddo   [img 220]
              TODAY 14:00 – 00:00 · Casuals
```

Control panel:
```
MadGear Control  ● live · 7 signed up · feed 12 min old
┌ P1 [img⬆] [ ATG                    ] [Next ▸] ┐
│ Signed up today: (ATG) (Maddo·dim) (Kuro) …   │
│ Recent:          (Joshi) (Pia) (Ferdl) …      │
└───────────────────────────────────────────────┘
┌ P2 … same …                                   ┐
[○ Show score on stream] [○ Edit players] [ Casuals ]
```

## Verify

- Feed: build with the token on the day of a session. Today's event has `signups`, other events don't. Simulate a failed Discord source: the fallback output has no `signups` except on today's event.
- Server with a local `feed.json` fixture:
  - pick, swap-by-chip, Next (alphabetical, skips the other side, wraps)
  - typed names commit on blur only
  - Recent caps at 30, ✕ removes
  - day change at 06:00 empties `today`
  - upload > 2 MB returns 413
- Overlays: `preview.html` for Match, Match · Fullscreen and On Break, with and without images, with the score on and off, and with `?noserver`.
- Panel on a tablet: chips at least 44 px, upload from the camera roll works.

## Not in scope / later

- Renaming a player and keeping the image (the image is keyed by name; re-upload for now).
- Avatars from Discord.
- A "here / not here" toggle for no-shows.
- Next/prev on the ESP buttons.
