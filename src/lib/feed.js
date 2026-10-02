// Build-time access to the feed written by scripts/fetch-feeds.mjs.
// A missing file (fresh clone, fetch not run) just means "no data", never a broken build.
import { readFileSync } from 'node:fs';

export function loadFeed() {
  try {
    return JSON.parse(readFileSync('src/data/feed.json', 'utf8'));
  } catch {
    return { generatedAt: null, sources: {}, events: [], discord: null, twitch: null, youtube: null };
  }
}
