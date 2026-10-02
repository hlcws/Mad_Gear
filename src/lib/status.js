// Shared by the build (initial HTML) and the browser (live updates),
// so "open now" is correct to the minute even between deploys.

const TZ = 'Europe/Berlin';
const MIN = 60e3;
const HOUR = 60 * MIN;
const DAY = 24 * HOUR;

const fmt = (opts) => new Intl.DateTimeFormat('de-DE', { timeZone: TZ, ...opts });
const dayFmt = fmt({ weekday: 'long', day: 'numeric', month: 'long' });
const shortDayFmt = fmt({ weekday: 'short', day: '2-digit', month: '2-digit' });
const timeFmt = fmt({ hour: '2-digit', minute: '2-digit' });
const ymd = fmt({ year: 'numeric', month: '2-digit', day: '2-digit' });

export const formatDay = (d) => dayFmt.format(new Date(d));
export const formatShortDay = (d) => shortDayFmt.format(new Date(d));
export const formatTime = (d) => timeFmt.format(new Date(d)).replace('24:', '00:');
export const formatRange = (s, e) => `${formatTime(s)} – ${formatTime(e)}`;

function calendarDaysBetween(a, b) {
  const da = new Date(ymd.format(a).split('.').reverse().join('-'));
  const db = new Date(ymd.format(b).split('.').reverse().join('-'));
  return Math.round((db - da) / DAY);
}

/** "heute", "morgen", "in 5 Tagen", "in 3 Wochen" */
export function relativeDay(date, now = new Date()) {
  const d = calendarDaysBetween(now, new Date(date));
  if (d <= 0) return 'heute';
  if (d === 1) return 'morgen';
  if (d < 14) return `in ${d} Tagen`;
  return `in ${Math.round(d / 7)} Wochen`;
}

/** "gerade eben", "vor 12 Min.", "vor 3 Std.", "vor 2 Tagen" */
export function ago(date, now = new Date()) {
  const ms = now - new Date(date);
  if (ms < 2 * MIN) return 'gerade eben';
  if (ms < HOUR) return `vor ${Math.round(ms / MIN)} Min.`;
  if (ms < DAY) return `vor ${Math.round(ms / HOUR)} Std.`;
  const d = Math.round(ms / DAY);
  if (d < 60) return `vor ${d} ${d === 1 ? 'Tag' : 'Tagen'}`;
  return `vor ${Math.round(d / 30)} Monaten`;
}

/** "noch 3 Std. 20 Min." / "in 45 Min." */
export function duration(ms) {
  const h = Math.floor(ms / HOUR);
  const m = Math.round((ms % HOUR) / MIN);
  return h ? `${h} Std.${m ? ` ${m} Min.` : ''}` : `${m} Min.`;
}

/** Sessions at the venue, i.e. not stream-only schedule slots. */
export const venueEvents = (feed) => (feed?.events ?? []).filter((e) => !e.streamOnly);

/**
 * The single answer to "can I come by?"
 *  kind: 'open' | 'soon' (starts within 12h) | 'next' | 'none'
 */
export function computeStatus(feed, now = new Date()) {
  const events = venueEvents(feed);
  const current = events.find((e) => new Date(e.start) <= now && now < new Date(e.end));
  if (current) return { kind: 'open', event: current, remaining: new Date(current.end) - now };
  const next = events.find((e) => new Date(e.start) > now);
  if (!next) return { kind: 'none' };
  const until = new Date(next.start) - now;
  return { kind: until < 12 * HOUR ? 'soon' : 'next', event: next, until };
}

/** Feed older than this means the updater is broken — say so honestly. */
export const isStale = (feed, now = new Date()) =>
  !feed?.generatedAt || now - new Date(feed.generatedAt) > 2 * DAY;
