// Shared Google Calendar (public ICS) reader for the site feed and the Discord sync.

import ical from 'node-ical';
import { site } from '../../src/site.config.mjs';

const HOUR = 3600e3;

/** Expanded calendar sessions (recurrences, EXDATEs and overrides applied), sorted by start. */
export async function loadCalendarSessions({ from, to }) {
  const { calendarIcs, calendarHidePattern } = site.feeds;
  const res = await fetch(calendarIcs);
  if (!res.ok) throw new Error(`${res.status} ${res.statusText} for calendar ICS`);
  const data = ical.sync.parseICS(await res.text());
  const hide = new RegExp(calendarHidePattern, 'i');

  const sessions = [];
  for (const ev of Object.values(data)) {
    if (ev.type !== 'VEVENT' || ev.recurrenceid) continue;
    if (ev.class === 'PRIVATE' || hide.test(String(ev.summary ?? ''))) continue;
    for (const inst of ical.expandRecurringEvent(ev, { from, to, expandOngoing: true })) {
      const title = String(inst.summary ?? ev.summary ?? 'Session');
      if (hide.test(title) || inst.event?.status === 'CANCELLED') continue;
      const start = inst.start;
      const end = inst.end && inst.end > start
        ? inst.end
        : new Date(start.getTime() + site.defaultSessionHours * HOUR);
      sessions.push({
        uid: ev.uid,
        title,
        description: String(inst.event?.description ?? ev.description ?? '').trim(),
        location: String(ev.location ?? '').trim(),
        start,
        end,
        recurring: !!ev.rrule && !inst.isOverride,
      });
    }
  }
  return sessions.sort((a, b) => a.start - b.start);
}
