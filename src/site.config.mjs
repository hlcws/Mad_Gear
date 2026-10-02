// Settings: links, address, data sources, Discord event template.
// Page wording lives in src/content/*.md and src/pages/*.md
// Used both by the Astro pages and by scripts/fetch-feeds.mjs.

export const site = {
  name: 'MadGearFFM',
  url: 'https://madgear.org',
  kanji: '魔奴義亜',
  kanjiReading: 'MA-DO-GI-A', // shown as [MA-DO-GI-A], T-shirt style
  tagline: 'Fighting Game Locals in Frankfurt / Rhein-Main',
  email: 'kontakt@madgear.org',

  address: {
    street: 'Dreieichstrasse 8',
    city: '64546 Mörfelden-Walldorf',
    floor: '2. OG links',
    mapsUrl: 'https://maps.app.goo.gl/?q=MadGearFFM+Dreieichstrasse+8+M%C3%B6rfelden-Walldorf',
  },

  // Shown as a hint only. "Open now" is decided purely from real events.
  usualSchedule: 'Meist samstags, 14:00 – Mitternacht',
  // Videos older than this are hidden, so old uploads never make the site look dead.
  maxVideoAgeDays: 180,

  // Used when an event has no end time (Discord events often don't).
  defaultSessionHours: 10,

  links: {
    discord: 'https://discord.gg/vNG3E345hk',
    twitch: 'https://twitch.tv/madgearffm',
    youtube: 'https://www.youtube.com/@madgearffm7547',
    twitter: 'https://twitter.com/madgearffm',
    paypal: 'https://paypal.me/madgearfgc',
    hardedge: 'https://hardedge.org/',
    calendar:
      'https://calendar.google.com/calendar/embed?src=kqg40hjscfpnkm780rhd7abr5s%40group.calendar.google.com&ctz=Europe%2FBerlin',
  },

  feeds: {
    discordGuildId: '335166996364787712',
    discordInviteCode: 'vNG3E345hk',
    calendarIcs:
      'https://calendar.google.com/calendar/ical/kqg40hjscfpnkm780rhd7abr5s%40group.calendar.google.com/public/basic.ics',
    // Calendar entries whose title matches this are private and never shown.
    calendarHidePattern: '^blocked',
    twitchLogin: 'madgearffm',
    youtubeChannelId: 'UCNiYLCtsPmiYseTgwZHCyHQ',
  },

  // Google Calendar → Discord: the bot creates Discord events for the next
  // sessions in the calendar, using this template. {date} = "Samstag, 10. Oktober".
  discordSync: {
    enabled: true,
    upcoming: 5,
    // Calendar titles matching this get the template name; anything else
    // (e.g. "MadGearFFM x Q-Rash League") keeps its own title.
    genericTitles: '^(madgear(ffm)?(:\\s*(casuals?|zocken))?|session|casuals?)$',
    name: 'Casual Session',
    description: [
      'Fighting Game Local im Mad Gear Clubhaus – {date}, {time}.',
      'Offene Casuals für jedes Skill-Level: SF, Tekken, KOF, GG & mehr.',
      'Bring deinen Controller mit, Konsolen & Screens sind da.',
      'Erster Besuch? Komplett kostenlos!',
      '',
      'Tickets & Infos: https://madgear.org',
    ].join('\n'),
    location: 'MadGearFFM, Dreieichstrasse 8, Mörfelden-Walldorf (2. OG links)',
    cover: 'public/photos/location1.jpg', // optional, shown as event banner
  },

};
