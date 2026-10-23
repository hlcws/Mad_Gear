// Google Calendar → Discord scheduled events.
//
// For the next N sessions in the public calendar, make sure a Discord event
// exists at that start time and matches the entry's title, description, end
// and location. Stateless: the bot only ever edits/deletes
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
const MATCH_WINDOW = 3 * 3600e3; // a hand-made Discord event within 3h of a session = same session
const MOVE_WINDOW = 14 * 24 * 3600e3; // a session moved by up to 2 weeks keeps its Discord event

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

// Title and description come from the calendar entry; the config template is only a fallback.
function eventPayload(s) {
  return {
    name: (s.title || cfg.name).slice(0, 100),
    description: (s.description || fill(cfg.description, s)).slice(0, 1000),
    scheduled_start_time: s.start.toISOString(),
    scheduled_end_time: s.end.toISOString(),
    privacy_level: 2, // GUILD_ONLY
    entity_type: 3, // EXTERNAL (a physical location)
    entity_metadata: { location: (s.location || cfg.location).slice(0, 100) },
  };
}

const t = (d) => new Date(d).getTime();
const norm = (x) => String(x ?? '').replace(/\r/g, '').trim();

/** Fields of the Discord event that differ from the calendar session (empty = up to date). */
function changes(e, p) {
  const diff = {};
  if (norm(e.name) !== norm(p.name)) diff.name = p.name;
  if (norm(e.description) !== norm(p.description)) diff.description = p.description;
  if (t(e.scheduled_start_time) !== t(p.scheduled_start_time)) diff.scheduled_start_time = p.scheduled_start_time;
  if (t(e.scheduled_end_time) !== t(p.scheduled_end_time)) diff.scheduled_end_time = p.scheduled_end_time;
  if (norm(e.entity_metadata?.location) !== norm(p.entity_metadata.location)) diff.entity_metadata = p.entity_metadata;
  return diff;
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

const near = (a, b) => Math.abs(t(a) - t(b)) < MATCH_WINDOW;
const exact = (a, b) => t(a) === t(b);

const plan = { create: [], update: [], remove: [] };
const free = new Set(ours); // bot events not yet matched to a session
const unmatched = [];

// 1) Bot event at the exact start time → same session, update it if title/description/etc. changed.
for (const s of wanted) {
  const e = [...free].find((x) => exact(x.scheduled_start_time, s.start));
  if (e) {
    free.delete(e);
    const diff = changes(e, eventPayload(s));
    if (Object.keys(diff).length) plan.update.push({ e, s, diff });
  } else if (!existing.some((x) => x.creator_id !== me.id && near(x.scheduled_start_time, s.start))) {
    unmatched.push(s); // a hand-made Discord event around that time counts as announced
  }
}

// 2) Session was moved in the calendar: move the bot's leftover event with the same title
//    instead of delete + recreate, so people's "Interested" clicks survive.
const orphan = (e) => !future.some((s) => exact(s.start, e.scheduled_start_time));
for (const s of unmatched) {
  const p = eventPayload(s);
  const e = [...free]
    .filter((x) => orphan(x) && x.name === p.name && Math.abs(t(x.scheduled_start_time) - t(s.start)) < MOVE_WINDOW)
    .sort((a, b) => Math.abs(t(a.scheduled_start_time) - t(s.start)) - Math.abs(t(b.scheduled_start_time) - t(s.start)))[0];
  if (e) {
    free.delete(e);
    plan.update.push({ e, s, diff: changes(e, p) });
  } else {
    plan.create.push(s);
  }
}

// 3) Bot events whose session no longer exists (deleted in the calendar).
//    Never delete if the calendar came back empty — more likely a fetch problem than a mass cancellation.
if (future.length > 0) {
  for (const e of free) if (orphan(e)) plan.remove.push(e);
}

console.log(`discord sync: ${wanted.length} upcoming sessions, ${existing.length} Discord events (${ours.length} by bot)`);
for (const e of plan.remove) console.log(`  - remove  ${e.scheduled_start_time}  ${e.name}`);
for (const { e, s, diff } of plan.update) console.log(`  ~ update  ${s.start.toISOString()}  ${s.title}  (${Object.keys(diff).join(', ')})`);
for (const s of plan.create) console.log(`  + create  ${s.start.toISOString()}  ${s.title}`);
if (!plan.create.length && !plan.update.length && !plan.remove.length) console.log('  nothing to do');
if (dryRun) {
  for (const s of [...plan.create, ...plan.update.map((u) => u.s)].slice(0, 1)) {
    const p = eventPayload(s);
    console.log(`\n  preview:\n  ${p.name}\n  ${p.description.replaceAll('\n', '\n  ')}`);
  }
} else {
  for (const e of plan.remove) await discord('DELETE', `/guilds/${guild}/scheduled-events/${e.id}`);
  for (const { e, diff } of plan.update) await discord('PATCH', `/guilds/${guild}/scheduled-events/${e.id}`, diff);
  const image = plan.create.length ? await coverImage() : undefined;
  for (const s of plan.create) {
    await discord('POST', `/guilds/${guild}/scheduled-events`, { ...eventPayload(s), ...(image ? { image } : {}) });
  }
}

// #kalender: one post per upcoming session, linking its Discord event. Stateless like the
// events: the bot finds its own posts by author and keys them by the event link they contain.
// A post is edited when the session changes (reactions survive), and deleted at 06:00 Berlin
// the day after the session, or earlier if its event disappears (session cancelled).
const channel = cfg.kalenderChannelId;
if (channel) {
  const events = (await discord('GET', `/guilds/${guild}/scheduled-events`)).filter((e) => e.status === 1);
  const eventFor = (s) =>
    events.find((e) => e.creator_id === me.id && exact(e.scheduled_start_time, s.start)) ??
    events.find((e) => e.creator_id !== me.id && near(e.scheduled_start_time, s.start));
  const eventLink = (id) => `https://discord.com/events/${guild}/${id}`;
  const unix = (d) => Math.floor(t(d) / 1000);
  const postText = (s, e) => {
    const p = eventPayload(s);
    return [`**${p.name}**`, `<t:${unix(s.start)}:F> – <t:${unix(s.end)}:t>`, p.entity_metadata.location, eventLink(e.id)].join('\n');
  };

  const posts = (await discord('GET', `/channels/${channel}/messages?limit=100`))
    .filter((m) => m.author.id === me.id)
    .map((m) => ({
      m,
      eventId: m.content.match(/discord\.com\/events\/\d+\/(\d+)/)?.[1],
      start: new Date(Number(m.content.match(/<t:(\d+):F>/)?.[1] ?? 0) * 1000),
    }));

  const day = (d) => new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Berlin' }).format(d); // YYYY-MM-DD
  const morningAfter = (start) => day(new Date(now.getTime() - 6 * 3600e3)) > day(start);
  const live = new Set(events.map((e) => e.id));

  const kal = { post: [], edit: [], remove: [] };
  for (const p of posts) {
    if (p.start <= now ? morningAfter(p.start) : future.length > 0 && !live.has(p.eventId)) kal.remove.push(p);
  }
  for (const s of wanted) {
    const e = eventFor(s);
    if (!e) { console.log(`  #kalender: no Discord event yet for ${s.start.toISOString()}, posting next run`); continue; }
    const p = posts.find((x) => x.eventId === e.id && !kal.remove.includes(x));
    const text = postText(s, e);
    if (!p) kal.post.push({ s, text });
    else if (p.m.content !== text) kal.edit.push({ p, s, text });
  }

  console.log(`#kalender: ${posts.length} bot posts`);
  for (const p of kal.remove) console.log(`  - remove  ${p.start.toISOString()}  ${p.m.content.split('\n')[0]}`);
  for (const { s } of kal.edit) console.log(`  ~ edit    ${s.start.toISOString()}  ${s.title}`);
  for (const { s, text } of kal.post) console.log(`  + post    ${s.start.toISOString()}  ${s.title}  (${text.split('\n').at(-1)})`);
  if (!kal.post.length && !kal.edit.length && !kal.remove.length) console.log('  nothing to do');

  if (!dryRun) {
    for (const p of kal.remove) await discord('DELETE', `/channels/${channel}/messages/${p.m.id}`);
    for (const { p, text } of kal.edit) await discord('PATCH', `/channels/${channel}/messages/${p.m.id}`, { content: text });
    for (const { text } of kal.post) {
      await discord('POST', `/channels/${channel}/messages`, { content: text, allowed_mentions: { parse: [] } });
    }
  }
}
if (dryRun) console.log('  (dry run, no changes made)');
