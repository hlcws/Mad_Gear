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

  // Google Calendar → Discord: the bot creates and updates Discord events for
  // the next sessions in the calendar. Title and description come straight
  // from the calendar entry; the values below are only fallbacks for entries
  // without them. {date} = "Samstag, 10. Oktober", {time} = "14:00 – 00:00".
  discordSync: {
    enabled: true,
    upcoming: 5,
    // Website only: calendar titles matching this are listed as "Casual Session"
    // without description. Discord always gets the calendar title.
    genericTitles: '^(madgear(ffm)?(:\\s*(casuals?|zocken))?|session|casuals?)$',
    name: 'Casual Session',
    // Same text as the Google Calendar entries. Written so it survives the ICS
    // line-break repair: every line ends in . ! ? or : (not followed by a digit),
    // no abbreviations like "usw." mid-sentence.
    description: [
      'Casual Fighting Games im MadGear Clubhaus!',
      'Street Fighter, Tekken, Guilty Gear oder dein Lieblingsgame – alles ist willkommen, egal ob Neuling oder Turnierprofi.',
      'PS4, Steam-PCs, Screens und Controller sind da, dein eigenes Pad kannst du gerne mitbringen.',
      'Keine Anmeldung nötig, einfach vorbeikommen!',
      'Dein erster Besuch ist kostenlos.',
      'Klick auf „Interessiert“, damit wir sehen, wer kommt.',
      'Infos, Preise und Streams:',
      'https://madgear.org',
      'https://twitch.tv/madgearffm',
      'https://www.youtube.com/@madgearffm7547/streams',
    ].join('\n'),
    location: 'MadGearFFM, Dreieichstrasse 8, Mörfelden-Walldorf (2. OG links)',
    cover: 'public/photos/location1.jpg', // optional, shown as event banner
  },

};
