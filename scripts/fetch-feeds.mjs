// Pulls everything that makes the site "current" and writes it to
// src/data/feed.json (used at build time) and public/feed.json (polled by
// visitors' browsers so an open tab picks up the next deploy).
//
// Every source is optional. Missing secrets => source is skipped.
// A failing source falls back to the last data published on the live site,
// so one flaky API never blanks out the page.
//
// Env: DISCORD_BOT_TOKEN, TWITCH_CLIENT_ID, TWITCH_CLIENT_SECRET

import { writeFile, mkdir } from 'node:fs/promises';
import { loadCalendarSessions } from './lib/calendar.mjs';
import { site } from '../src/site.config.mjs';

const { feeds } = site;
const env = process.env;
const now = new Date();
const windowFrom = new Date(now.getTime() - 24 * 3600e3);
const windowTo = new Date(now.getTime() + 180 * 24 * 3600e3);
const HOUR = 3600e3;

async function getJson(url, init) {
  const res = await fetch(url, init);
  if (!res.ok) throw new Error(`${res.status} ${res.statusText} for ${url.split('?')[0]}`);
  return res.json();
}

async function getText(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${res.status} ${res.statusText} for ${url.split('?')[0]}`);
  return res.text();
}

// ---------- Discord ----------

async function discordEvents() {
  if (!env.DISCORD_BOT_TOKEN) return { status: 'skipped (no DISCORD_BOT_TOKEN)' };
  const gid = feeds.discordGuildId;
  const list = await getJson(
    `https://discord.com/api/v10/guilds/${gid}/scheduled-events?with_user_count=true`,
    { headers: { Authorization: `Bot ${env.DISCORD_BOT_TOKEN}` } },
  );
  const events = list
    .filter((e) => e.status === 1 || e.status === 2) // scheduled or active
    .map((e) => ({
      id: `discord-${e.id}`,
      source: 'discord',
      title: e.name,
      description: e.description || '',
      start: e.scheduled_start_time,
      end: e.scheduled_end_time || null,
      active: e.status === 2,
      interested: e.user_count ?? null,
      location: e.entity_metadata?.location || '',
      url: `https://discord.com/events/${gid}/${e.id}`,
      image: e.image ? `https://cdn.discordapp.com/guild-events/${e.id}/${e.image}.png?size=600` : null,
    }));
  return { status: 'ok', events };
}

async function discordStats() {
  const inv = await getJson(
    `https://discord.com/api/v10/invites/${feeds.discordInviteCode}?with_counts=true`,
  );
  return {
    status: 'ok',
    stats: { members: inv.approximate_member_count, online: inv.approximate_presence_count },
  };
}

// ---------- Google Calendar (public ICS) ----------

async function calendarEvents() {
  if (!feeds.calendarIcs) return { status: 'skipped (no calendarIcs)' };
  const sessions = await loadCalendarSessions({ from: windowFrom, to: windowTo });
  const events = sessions.map((c) => ({
    id: `cal-${c.uid}-${c.start.toISOString()}`,
    source: 'calendar',
    title: c.title,
    description: c.description,
    start: c.start.toISOString(),
    end: c.end.toISOString(),
    location: c.location,
    url: site.links.calendar,
    recurring: c.recurring,
  }));
  return { status: 'ok', events };
}

// ---------- Twitch ----------

const twitchThumb = (u, w, h) =>
  u?.replace('%{width}', w).replace('%{height}', h).replace('{width}', w).replace('{height}', h);

async function twitch() {
  if (!env.TWITCH_CLIENT_ID || !env.TWITCH_CLIENT_SECRET)
    return { status: 'skipped (no TWITCH_CLIENT_ID/SECRET)' };
  const tok = await getJson(
    `https://id.twitch.tv/oauth2/token?client_id=${env.TWITCH_CLIENT_ID}` +
      `&client_secret=${env.TWITCH_CLIENT_SECRET}&grant_type=client_credentials`,
    { method: 'POST' },
  );
  const headers = { 'Client-Id': env.TWITCH_CLIENT_ID, Authorization: `Bearer ${tok.access_token}` };
  const helix = (path) => getJson(`https://api.twitch.tv/helix/${path}`, { headers });

  const user = (await helix(`users?login=${feeds.twitchLogin}`)).data[0];
  if (!user) throw new Error(`Twitch user ${feeds.twitchLogin} not found`);
  const [streams, videos, schedule] = await Promise.all([
    helix(`streams?user_id=${user.id}`),
    helix(`videos?user_id=${user.id}&first=8&sort=time`),
    helix(`schedule?broadcaster_id=${user.id}&first=10`).catch(() => null), // 404 if no schedule
  ]);
  const s = streams.data[0];

  const scheduled = (schedule?.data?.segments ?? [])
    .filter((seg) => !seg.canceled_until)
    .map((seg) => ({
      id: `twitch-${seg.id}`,
      source: 'twitch',
      title: seg.title || 'Stream',
      description: seg.category?.name ?? '',
      start: seg.start_time,
      end: seg.end_time,
      location: '',
      url: `https://twitch.tv/${feeds.twitchLogin}/schedule`,
      streamOnly: true,
    }));

  return {
    status: 'ok',
    events: scheduled,
    twitch: {
      login: user.login,
      avatar: user.profile_image_url,
      live: !!s,
      stream: s
        ? {
            title: s.title,
            game: s.game_name,
            viewers: s.viewer_count,
            startedAt: s.started_at,
            thumbnail: twitchThumb(s.thumbnail_url, 640, 360),
          }
        : null,
      videos: videos.data.map((v) => ({
        id: v.id,
        title: v.title,
        url: v.url,
        thumbnail: twitchThumb(v.thumbnail_url, 480, 270) || null,
        publishedAt: v.published_at,
        duration: v.duration,
        views: v.view_count,
        type: v.type,
      })),
    },
  };
}

// ---------- YouTube (public RSS, no key needed) ----------

async function youtube() {
  if (!feeds.youtubeChannelId) return { status: 'skipped (no youtubeChannelId)' };
  const xml = await getText(
    `https://www.youtube.com/feeds/videos.xml?channel_id=${feeds.youtubeChannelId}`,
  );
  const decode = (s) =>
    s.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'");
  const pick = (block, re) => block.match(re)?.[1] ?? '';
  const videos = [...xml.matchAll(/<entry>([\s\S]*?)<\/entry>/g)].slice(0, 8).map(([, b]) => {
    const id = pick(b, /<yt:videoId>(.*?)<\/yt:videoId>/);
    return {
      id,
      title: decode(pick(b, /<title>(.*?)<\/title>/)),
      url: `https://www.youtube.com/watch?v=${id}`,
      thumbnail: `https://i.ytimg.com/vi/${id}/mqdefault.jpg`,
      publishedAt: pick(b, /<published>(.*?)<\/published>/),
      views: Number(pick(b, /<media:statistics views="(\d+)"/)) || null,
    };
  });
  return { status: 'ok', youtube: { videos } };
}

// ---------- assemble ----------

async function previousFeed() {
  try {
    return await getJson(`${site.url ?? 'https://madgear.org'}/feed.json`);
  } catch {
    return null;
  }
}

async function run(name, fn) {
  try {
    return await fn();
  } catch (err) {
    console.warn(`[${name}] ${err.message}`);
    return { status: `error: ${err.message}`, failed: true };
  }
}

const [dEv, dSt, cal, tw, yt, prev] = await Promise.all([
  run('discord-events', discordEvents),
  run('discord-stats', discordStats),
  run('calendar', calendarEvents),
  run('twitch', twitch),
  run('youtube', youtube),
  previousFeed(),
]);

const fallbackEvents = (src) => (prev?.events ?? []).filter((e) => e.source === src);

let events = [
  ...(dEv.failed ? fallbackEvents('discord') : dEv.events ?? []),
  ...(cal.failed ? fallbackEvents('calendar') : cal.events ?? []),
  ...(tw.failed ? fallbackEvents('twitch') : tw.events ?? []),
];

// Fill in missing end times, then drop anything that's already over.
events = events.map((e) => ({
  ...e,
  end: e.end ?? new Date(new Date(e.start).getTime() + site.defaultSessionHours * HOUR).toISOString(),
}));
events = events.filter((e) => new Date(e.end) > now);

// Same session announced in Discord and in the calendar: keep the Discord one.
const priority = { discord: 0, calendar: 1, twitch: 2 };
events.sort((a, b) => priority[a.source] - priority[b.source]);
const deduped = [];
for (const e of events) {
  const t = new Date(e.start).getTime();
  const dup = deduped.find((d) => !d.streamOnly && !e.streamOnly && Math.abs(new Date(d.start).getTime() - t) < 3 * HOUR);
  if (!dup) deduped.push(e);
}
deduped.sort((a, b) => new Date(a.start) - new Date(b.start));

const feed = {
  generatedAt: now.toISOString(),
  sources: {
    discordEvents: dEv.status,
    discordStats: dSt.status,
    calendar: cal.status,
    twitch: tw.status,
    youtube: yt.status,
  },
  events: deduped,
  discord: dSt.failed ? prev?.discord ?? null : dSt.stats,
  twitch: tw.failed ? prev?.twitch ?? null : tw.twitch ?? null,
  youtube: yt.failed ? prev?.youtube ?? null : yt.youtube ?? null,
};

const json = JSON.stringify(feed, null, 2);
await mkdir('src/data', { recursive: true });
await mkdir('public', { recursive: true });
await writeFile('src/data/feed.json', json);
await writeFile('public/feed.json', json);

console.log(`feed: ${deduped.length} upcoming events`);
for (const [k, v] of Object.entries(feed.sources)) console.log(`  ${k.padEnd(14)} ${v}`);
