// Google Calendar → Discord scheduled events.
//
// For the next N sessions in the public calendar, make sure a Discord event
// exists at that start time. Stateless: the bot only ever edits/deletes
// events it created itself (creator_id === bot), so anything a human made in
// Discord is left alone and also counts as "already announced".
//
// Env: DISCORD_BOT_TOKEN (bot needs the "Create Events" + "Manage Events" permission)
//      SYNC_DRY_RUN=1 to only print what would happen.

import { readFile } from 'node:fs/promises';
import { extname } from 'node:path';
import { site } from '../src/site.config.mjs';
import { loadCalendarSessions } from './lib/calendar.mjs';
import { formatDay, formatRange } from '../src/lib/status.js';

const cfg = site.discordSync;
const token = process.env.DISCORD_BOT_TOKEN;
const dryRun = !!process.env.SYNC_DRY_RUN;
const guild = site.feeds.discordGuildId;
const API = 'https://discord.com/api/v10';
const MATCH_WINDOW = 3 * 3600e3; // a Discord event within 3h of a session = same session

if (!cfg?.enabled) { console.log('discord sync: disabled in config'); process.exit(0); }
if (!token) { console.log('discord sync: skipped (no DISCORD_BOT_TOKEN)'); process.exit(0); }

async function discord(method, path, body) {
  for (let attempt = 0; attempt < 4; attempt++) {
    const res = await fetch(API + path, {
      method,
      headers: { Authorization: `Bot ${token}`, 'Content-Type': 'application/json' },
      body: body ? JSON.stringify(body) : undefined,
    });
    if (res.status === 429) {
      const { retry_after = 1 } = await res.json().catch(() => ({}));
      await new Promise((r) => setTimeout(r, retry_after * 1000 + 250));
      continue;
    }
    if (!res.ok) throw new Error(`${method} ${path}: ${res.status} ${await res.text()}`);
    return res.status === 204 ? null : res.json();
  }
  throw new Error(`${method} ${path}: rate limited`);
}

async function coverImage() {
  if (!cfg.cover) return undefined;
  try {
    const buf = await readFile(cfg.cover);
    const type = { '.png': 'png', '.gif': 'gif', '.webp': 'webp' }[extname(cfg.cover).toLowerCase()] ?? 'jpeg';
    return `data:image/${type};base64,${buf.toString('base64')}`;
  } catch {
    console.warn(`cover image ${cfg.cover} not found, creating events without banner`);
    return undefined;
  }
}

const fill = (tpl, s) =>
  tpl.replaceAll('{date}', formatDay(s.start)).replaceAll('{time}', formatRange(s.start, s.end));

function eventPayload(s, image) {
  const generic = new RegExp(cfg.genericTitles, 'i').test(s.title.trim());
  return {
    name: (generic ? cfg.name : s.title).slice(0, 100),
    description: (s.description && !generic ? `${s.description}\n\n` : '') + fill(cfg.description, s),
    scheduled_start_time: s.start.toISOString(),
    scheduled_end_time: s.end.toISOString(),
    privacy_level: 2, // GUILD_ONLY
    entity_type: 3, // EXTERNAL (a physical location)
    entity_metadata: { location: (s.location || cfg.location).slice(0, 100) },
    ...(image ? { image } : {}),
  };
}

const now = new Date();
const me = await discord('GET', '/users/@me');

// Wide window so a deleted/moved calendar session is noticed even if it was far out.
const sessions = await loadCalendarSessions({
  from: now,
  to: new Date(now.getTime() + 365 * 24 * 3600e3),
});
const future = sessions.filter((s) => s.start > now);
const wanted = future.slice(0, cfg.upcoming);

const existing = (await discord('GET', `/guilds/${guild}/scheduled-events`))
  .filter((e) => e.status === 1); // SCHEDULED (not active/completed/cancelled)
const ours = existing.filter((e) => e.creator_id === me.id);

const near = (a, b) => Math.abs(new Date(a).getTime() - new Date(b).getTime()) < MATCH_WINDOW;
const exact = (a, b) => new Date(a).getTime() === new Date(b).getTime();

const plan = { create: [], remove: [] };

// 1) Sessions that need an event.
for (const s of wanted) {
  const covered = existing.some((e) => near(e.scheduled_start_time, s.start)
    // our own event must match exactly, otherwise the session was moved → recreate
    && (e.creator_id !== me.id || exact(e.scheduled_start_time, s.start)));
  if (!covered) plan.create.push(s);
}

// 2) Our events whose session no longer exists at that exact time (deleted or moved).
//    Never delete if the calendar came back empty — more likely a fetch problem than a mass cancellation.
if (future.length > 0) {
  for (const e of ours) {
    if (!future.some((s) => exact(s.start, e.scheduled_start_time))) plan.remove.push(e);
  }
}

console.log(`discord sync: ${wanted.length} upcoming sessions, ${existing.length} Discord events (${ours.length} by bot)`);
for (const e of plan.remove) console.log(`  - remove  ${e.scheduled_start_time}  ${e.name}`);
for (const s of plan.create) console.log(`  + create  ${s.start.toISOString()}  ${s.title}`);
if (!plan.create.length && !plan.remove.length) console.log('  nothing to do');
if (dryRun) { console.log('  (dry run, no changes made)'); process.exit(0); }

for (const e of plan.remove) await discord('DELETE', `/guilds/${guild}/scheduled-events/${e.id}`);
const image = plan.create.length ? await coverImage() : undefined;
for (const s of plan.create) await discord('POST', `/guilds/${guild}/scheduled-events`, eventPayload(s, image));
