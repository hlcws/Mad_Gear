// HTML for the live parts of the page. Runs at build time (so the page works
// without JS) and again in the browser every minute against the latest feed.

import { site } from '../site.config.mjs';
import {
  computeStatus, venueEvents, isStale, formatDay, formatRange, formatTime,
  relativeDay, ago, duration,
} from './status.js';

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => (
  { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

const generic = new RegExp(site.discordSync?.genericTitles ?? '^$', 'i');
const displayTitle = (e) => (generic.test(e.title.trim()) ? 'Casual Session' : e.title);

// Discord is optional: people can just turn up. It's only "who else is coming?".
function eventCta(e) {
  const href = e.source === 'discord' ? e.url : site.links.discord;
  return `<a class="btn btn-discord" href="${esc(href)}">Wer kommt noch?</a>`;
}
const noSignup = '<p class="status-note">Keine Anmeldung nötig, einfach spontan vorbeikommen.</p>';

function metaLine(feed, now) {
  const parts = [];
  if (isStale(feed, now)) {
    parts.push(`<span class="warn">⚠ Termindaten zuletzt ${feed?.generatedAt ? ago(feed.generatedAt, now) : 'nie'} aktualisiert – im Discord nachfragen</span>`);
  } else {
    parts.push(`<span class="ok">●</span><span>Stand ${ago(feed.generatedAt, now)}</span>`);
  }
  if (feed?.discord?.members) {
    parts.push(`<span>Discord: ${feed.discord.members} Mitglieder · ${feed.discord.online} online</span>`);
  }
  const lastStream = [feed?.twitch?.videos?.[0], feed?.youtube?.videos?.[0]]
    .filter(Boolean)
    .sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt))[0];
  const fresh = lastStream && now - new Date(lastStream.publishedAt) < (site.maxVideoAgeDays ?? 180) * 864e5;
  if (fresh) parts.push(`<span>Letzter Stream ${ago(lastStream.publishedAt, now)}</span>`);
  return `<p class="status-meta">${parts.join('')}</p>`;
}

function liveBanner(feed) {
  const tw = feed?.twitch?.live && feed.twitch.stream;
  if (tw) {
    return `<a class="live-banner" href="${esc(site.links.twitch)}">
      <span class="pill pill-live"><span class="dot"></span>Live</span>
      <span><strong>${esc(tw.title)}</strong><small>Twitch · ${esc(tw.game)} · ${tw.viewers} Zuschauer</small></span>
    </a>`;
  }
  const yt = feed?.youtube?.live;
  if (yt) {
    return `<a class="live-banner" href="${esc(yt.url)}">
      <span class="pill pill-live"><span class="dot"></span>Live</span>
      <span><strong>${esc(yt.title)}</strong><small>Jetzt live auf YouTube</small></span>
    </a>`;
  }
  return '';
}

export function renderStatus(feed, now = new Date()) {
  const st = computeStatus(feed, now);
  const directions = '<a class="btn" href="/anfahrt.html">Anfahrt</a>';
  let body;

  if (st.kind === 'open') {
    body = `
      <span class="pill pill-open"><span class="dot"></span>Clubhaus offen</span>
      <p class="status-when">Jetzt geöffnet</p>
      <p class="status-sub"><strong>${esc(displayTitle(st.event))}</strong> · bis ${formatTime(st.event.end)} Uhr (noch ${duration(st.remaining)})</p>
      <div class="btn-row"><a class="btn btn-primary" href="/anfahrt.html">Wie komme ich hin?</a>${eventCta(st.event)}</div>${noSignup}`;
  } else if (st.kind === 'soon' || st.kind === 'next') {
    const soon = st.kind === 'soon';
    body = `
      <span class="pill ${soon ? 'pill-soon' : 'pill-next'}"><span class="dot"></span>${soon ? `Heute · in ${duration(st.until)}` : 'Nächste Session'}</span>
      <p class="status-when">${formatDay(st.event.start)}</p>
      <p class="status-sub"><strong>${formatRange(st.event.start, st.event.end)} Uhr</strong> · ${relativeDay(st.event.start, now)} · ${esc(displayTitle(st.event))}</p>
      <div class="btn-row"><a class="btn btn-primary" href="/anfahrt.html">Wie komme ich hin?</a>${eventCta(st.event)}</div>${noSignup}`;
  } else {
    body = `
      <span class="pill"><span class="dot"></span>Clubhaus zu</span>
      <p class="status-when">Gerade kein Termin eingetragen</p>
      <p class="status-sub">Uns gibt's noch! Neue Sessions kündigen wir im Discord an. ${esc(site.usualSchedule)}.</p>
      <div class="btn-row"><a class="btn btn-discord" href="${esc(site.links.discord)}">Im Discord nachfragen</a>${directions}</div>`;
  }
  return body + liveBanner(feed) + metaLine(feed, now);
}

export function statusKind(feed, now = new Date()) {
  return computeStatus(feed, now).kind;
}

export function renderEvents(feed, { limit = 6, now = new Date(), withStreams = false } = {}) {
  const events = (withStreams ? feed?.events ?? [] : venueEvents(feed))
    .filter((e) => new Date(e.end) > now)
    .slice(0, limit);

  if (!events.length) {
    return `<div class="empty">Aktuell sind keine Termine eingetragen. Neue Sessions kündigen wir im
      <a href="${esc(site.links.discord)}">Discord</a> an – schau dort vorbei oder frag einfach nach.</div>`;
  }

  const dow = new Intl.DateTimeFormat('de-DE', { timeZone: 'Europe/Berlin', weekday: 'short' });
  const day = new Intl.DateTimeFormat('de-DE', { timeZone: 'Europe/Berlin', day: 'numeric' });
  const mon = new Intl.DateTimeFormat('de-DE', { timeZone: 'Europe/Berlin', month: 'short' });

  const items = events.map((e) => {
    const isNow = new Date(e.start) <= now;
    const tags = [
      isNow ? '<span class="tag pill-open">Jetzt offen</span>' : `<span class="tag">${relativeDay(e.start, now)}</span>`,
      e.streamOnly ? '<span class="tag tag-stream">Twitch-Stream</span>' : '',
      e.source === 'discord' ? `<span class="tag tag-confirmed">Discord${e.interested ? ` · ${e.interested} dabei` : ''}</span>` : '',
      e.recurring ? '<span class="tag">Regeltermin</span>' : '',
    ].join('');
    const desc = e.description && !generic.test(e.title.trim())
      ? `<p class="event-desc">${esc(e.description.slice(0, 220))}</p>` : '';
    const start = new Date(e.start);
    return `<li><a class="event${isNow ? ' is-now' : ''}" href="${esc(e.url || site.links.discord)}">
      <div class="event-date"><div class="dow">${dow.format(start).replace('.', '')}</div><div class="day">${day.format(start).replace('.', '')}</div><div class="mon">${mon.format(start).replace('.', '')}</div></div>
      <div>
        <p class="event-title">${esc(displayTitle(e))}</p>
        <p class="event-info">${formatRange(e.start, e.end)} Uhr${e.location ? ` · ${esc(e.location)}` : ''}</p>
        <div class="event-tags">${tags}</div>${desc}
      </div>
    </a></li>`;
  });
  return `<ul class="events">${items.join('')}</ul>`;
}
