# Session posts in #kalender

## Goal

The bot posts one message per upcoming session into `#kalender`, so the channel always lists the next sessions without anyone posting by hand. It removes each post the morning after its session.

## Verified (probe, 2026-10-23)

- There are two `#kalender` channels. The live one is `593081981101670413` (top level, last post 2026-09-23). `435366914559311873` sits in `archive` and has been unused since 2019.
- The live channel's topic: react with an emoji on a session's post if you want to come. Its posts so far were made by hand (hlcws, atg213).
- The bot (role *Sodom*) can view the channel but **can't send there**. `@everyone` is denied Send Messages, and the bot only has View, Create Events and Manage Events.
- The bot has no Message Content intent, so it reads other people's messages as empty. That's fine, because it only needs to read its own.

## Decisions (from Q&A)

| Topic | Decision |
|---|---|
| Format | One message per session, edited in place when the calendar changes, so reactions stay |
| Which sessions | The next `discordSync.upcoming` (5) from the calendar. A session whose Discord event was made by hand still gets a post, linked to that event |
| Removal | Only the bot's own posts, once it is 06:00 Europe/Berlin on the day after the session. You delete the old hand-made posts yourself, once |
| Cancelled session | If its Discord event disappears before it starts, the post goes on the next run |

## Behaviour

**Where:** a second phase at the end of `scripts/sync-discord-events.mjs`. It already has the bot user, the calendar sessions and the Discord helper. After phase 1 has run, it re-reads the guild's scheduled events, so it can link the events it just created. If phase 1 fails, phase 2 doesn't run; that's acceptable because the events it would link to are missing anyway.

**Config:** `site.discordSync.kalenderChannelId: '593081981101670413'`. If it's missing, phase 2 is off.

**Message** (plain text, German). The event link should unfurl into Discord's event card with its *Interested* button:
```
**{calendar title}**
<t:{start}:F> – <t:{end}:t>
{location}
https://discord.com/events/{guild}/{eventId}
```
Discord timestamps show in each reader's own time zone and language. Mentions are disabled (`allowed_mentions: { parse: [] }`), so nobody gets pinged.

**Stateless matching:** read the channel's last 100 messages and keep only the bot's own. Each post's key is the event ID in its link, and the post's start time is read back from its `<t:…:F>` timestamp.
- Session → event: use the bot event that phase 1 matched to it (exact start time), or a hand-made event within 3 h. A session with no event yet is skipped and gets posted on the next run.
- Session has no post with its event ID → post one. When several posts are new, they go out in date order.
- A post exists but its text differs (title, time, location changed, or the session moved and kept its event) → edit it.
- Post's start time has passed and it's now at least 06:00 Berlin on the day after → delete it.
- Post's start time is still ahead but its event is gone (session deleted in the calendar, or a human deleted the event) → delete it. Like phase 1, this never happens when the calendar came back empty.
- `SYNC_DRY_RUN=1` prints the post/edit/delete plan and changes nothing.

## Acceptance checks

1. `node --env-file=.env scripts/sync-discord-events.mjs` with `SYNC_DRY_RUN=1`: the log shows `#kalender` lines with `+ post` for the next 5 sessions, each with its event ID.
2. Once the permission is set (see below), a real run posts 5 messages in date order, each one rendering the event card.
3. Running it again prints `nothing to do` for `#kalender`.
4. Change a session's title in Google Calendar, then run: the same message is edited, and its reactions are still there.
5. Delete a future session in the calendar, then run: its Discord event and its post are both gone.
6. Morning after a session: the next run after 06:00 deletes that session's post. Check against the first real session; there's no clock mock.
7. `npm run check` passes.

## Non-goals

- Deleting or editing posts made by humans
- Pinning, threads, embeds or an overview message
- Adding emoji reactions automatically. The event's *Interested* button covers sign-up
- Paging past 100 messages, since the channel holds only a handful
- Reordering posts. A session inserted between existing ones shows up below them; its date makes that clear

## Effort

**S** (30–60 min agent time, 1 session).

**Your part:**
1. In Discord, open `#kalender` → Edit Channel → Permissions → add role *Sodom* → allow **Send Messages**, **Embed Links** and **Read Message History**.
2. Delete the old hand-made posts once, if you want them gone.
3. Optional: reword the channel topic. "React with an emoji" still works, but the event card's *Interested* button is the new sign-up.
4. After the first deploy, look at the channel and confirm the event cards render (check 2).
