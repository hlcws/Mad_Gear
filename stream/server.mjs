// MadGear stream overlays: tiny local server, no dependencies.
// Only the live scoreboard depends on it: it keeps the score, pushes changes to the
// score layers (OBS browser sources) via Server-Sent Events and listens for deck hotkeys.
// Frames are PNGs, chat and sessions are standalone files: they work without this server.
//
//   node server.mjs        then open http://localhost:8123/control.html
//
// Streamdeck: every action is a plain GET, e.g. http://localhost:8123/api/p1/plus
//
// Player picker: today's Discord sign-ups come from madgear.org/feed.json (MADGEAR_FEED
// overrides it with another URL or a local file, for testing). Recent players and their
// images stay on this PC: players.json + players/ (both gitignored).

import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import readline from 'node:readline';
import { spawn } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { fileURLToPath } from 'node:url';

const dir = path.dirname(fileURLToPath(import.meta.url));
const config = JSON.parse(fs.readFileSync(path.join(dir, 'config.json'), 'utf8'));
const stateFile = path.join(dir, 'state.json');
const staticDir = path.join(dir, 'overlays');
const playersFile = path.join(dir, 'players.json');
const imageDir = path.join(dir, 'players');
const FEED = process.env.MADGEAR_FEED || 'https://madgear.org/feed.json';
const RECENT_MAX = 30;
const IMAGE_MAX = 2 * 1024 * 1024;

const d = config.defaults;
let state = { p1: d.p1, p2: d.p2, s1: 0, s2: 0, ft: d.ft, title: d.title, score: false, img1: null, img2: null };
try {
  const saved = JSON.parse(fs.readFileSync(stateFile, 'utf8'));
  for (const k in state) if (k in saved) state[k] = saved[k];
} catch {}

// ---------- Players: sign-ups, recent, today, images ----------

// Session day: Berlin date of (time − 6 h), same rule as the #kalender posts and feed.json,
// so a session running past midnight stays one day.
const berlinDate = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Berlin' }); // YYYY-MM-DD
const sessionDay = (t = Date.now()) => berlinDate.format(new Date(new Date(t).getTime() - 6 * 3600e3));
const key = (name) => name.trim().toLowerCase();
const same = (a, b) => key(a) === key(b);
const byName = (a, b) => a.localeCompare(b, 'en', { sensitivity: 'base' });

let players = { recent: [], today: { day: sessionDay(), names: [] }, images: {} };
try { players = { ...players, ...JSON.parse(fs.readFileSync(playersFile, 'utf8')) }; } catch {}

// Today's sign-ups from feed.json: the Discord event(s) starting on the current session day
let feed = { events: [], generatedAt: null };
async function loadFeed() {
  try {
    const data = /^https?:/.test(FEED)
      ? await (await fetch(FEED, { cache: 'no-store', signal: AbortSignal.timeout(15e3) })).json()
      : JSON.parse(fs.readFileSync(FEED, 'utf8'));
    if (!Array.isArray(data.events)) throw new Error('no events');
    feed = data; // a failed fetch keeps the last good list
  } catch (err) {
    console.log(`  feed.json: ${err.message} (keeping the last list)`);
  }
  poolChanged(false);
}
function signups() {
  const day = sessionDay();
  const names = [];
  for (const e of feed.events) {
    if (e.source !== 'discord' || !Array.isArray(e.signups) || sessionDay(e.start) !== day) continue;
    for (const n of e.signups) if (!names.some((m) => same(m, n))) names.push(n);
  }
  return names.sort(byName);
}

function rollDay() {
  const day = sessionDay();
  if (players.today.day !== day) { players.today = { day, names: [] }; return true; }
  return false;
}

// Picked via a chip or Next, or typed and the field left. Returns the name, in Discord's spelling for sign-ups.
function entered(name) {
  name = signups().find((n) => same(n, name)) ?? name;
  rollDay();
  players.recent = [name, ...players.recent.filter((n) => !same(n, name))].slice(0, RECENT_MAX);
  players.today.names = [...players.today.names.filter((n) => !same(n, name)), name];
  return name;
}

function imageUrl(name) {
  const file = name && players.images[key(name)];
  if (!file) return null;
  try { return `/players/${file}?v=${Math.round(fs.statSync(path.join(imageDir, file)).mtimeMs)}`; } catch { return null; }
}

function pool() {
  rollDay();
  const up = signups();
  return {
    signups: up,
    recent: players.recent.filter((n) => !up.some((m) => same(m, n))),
    today: players.today.names,
    images: Object.fromEntries([...up, ...players.recent].map((n) => [n, imageUrl(n)]).filter(([, u]) => u)),
    feedAge: feed.generatedAt ? Math.round((Date.now() - new Date(feed.generatedAt)) / 1000) : null,
  };
}

// ---------- State + push ----------

const clients = new Set();
const send = (msg) => { for (const res of clients) res.write(msg); };
function changed() {
  state.img1 = imageUrl(state.p1);
  state.img2 = imageUrl(state.p2);
  fs.writeFile(stateFile, JSON.stringify(state, null, 2), () => {});
  send(`data: ${JSON.stringify(state)}\n\n`);
}
// Only the control panel listens to "pool" events; the overlays only read the state.
function poolChanged(save = true) {
  if (save) fs.writeFile(playersFile, JSON.stringify(players, null, 2), () => {});
  send(`event: pool\ndata: ${JSON.stringify(pool())}\n\n`);
}

const clamp = (n) => Math.max(0, Math.min(state.ft, n));
const swap = () => { [state.p1, state.p2, state.s1, state.s2] = [state.p2, state.p1, state.s2, state.s1]; };

// Next: today's sign-ups + names entered today, alphabetical, without the other side's player
function next(side) {
  const other = state[side === 1 ? 'p2' : 'p1'];
  const cur = state['p' + side];
  rollDay();
  const list = [...signups()];
  for (const n of players.today.names) if (!list.some((m) => same(m, n))) list.push(n);
  const cycle = list.filter((n) => !same(n, other)).sort(byName);
  if (!cycle.length) return;
  const name = cycle[(cycle.findIndex((n) => same(n, cur)) + 1) % cycle.length]; // not in list: -1 → first
  state['p' + side] = name;
  entered(name);
  poolChanged();
}

const actions = {
  'p1/plus': () => { state.s1 = clamp(state.s1 + 1); },
  'p1/minus': () => { state.s1 = clamp(state.s1 - 1); },
  'p2/plus': () => { state.s2 = clamp(state.s2 + 1); },
  'p2/minus': () => { state.s2 = clamp(state.s2 - 1); },
  reset: () => { state.s1 = 0; state.s2 = 0; },
  swap,
  'ft/plus': () => { state.ft = Math.min(99, state.ft + 1); },
  'ft/minus': () => { state.ft = Math.max(1, state.ft - 1); state.s1 = clamp(state.s1); state.s2 = clamp(state.s2); },
  'p1/next': () => next(1),
  'p2/next': () => next(2),
  'score/toggle': () => { state.score = !state.score; },
};
const textFields = ['p1', 'p2', 'title'];

// Windows: global hotkeys Ctrl+Alt+Shift+1..8 for decks that can only send key presses.
const hotkeyActions = ['p1/plus', 'p1/minus', 'p2/plus', 'p2/minus', 'reset', 'swap', 'p1/next', 'p2/next'];
function startHotkeys() {
  if (process.platform !== 'win32' || process.env.MADGEAR_NO_HOTKEYS) return;
  const ps = spawn('powershell.exe', ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', path.join(dir, 'hotkeys.ps1'), ...hotkeyActions], { windowsHide: true });
  readline.createInterface({ input: ps.stdout }).on('line', (line) => {
    line = line.trim();
    if (line === 'ready') console.log('  Hotkeys: Ctrl+Alt+Shift+1..8 = P1+ P1- P2+ P2- Reset Swap P1-Next P2-Next');
    else if (line.startsWith('taken:')) console.log(`  Hotkey for ${line.slice(6)} is used by another app`);
    else if (actions[line]) { actions[line](); changed(); }
  });
  process.on('exit', () => ps.kill());
  process.on('SIGINT', () => process.exit());
}

const types = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript',
  '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.json': 'application/json',
};
function json(res, data, code = 200) {
  res.writeHead(code, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', 'Access-Control-Allow-Origin': '*' });
  res.end(JSON.stringify(data));
}

http.createServer((req, res) => {
  const url = new URL(req.url, 'http://localhost');
  const p = decodeURIComponent(url.pathname);

  if (p === '/api/events') {
    res.writeHead(200, { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-store', Connection: 'keep-alive' });
    res.write(`data: ${JSON.stringify(state)}\n\n`);
    res.write(`event: pool\ndata: ${JSON.stringify(pool())}\n\n`);
    clients.add(res);
    const ping = setInterval(() => res.write(': ping\n\n'), 20e3);
    req.on('close', () => { clearInterval(ping); clients.delete(res); });
    return;
  }
  if (p === '/api/state') return json(res, state);
  if (p === '/api/config') return json(res, config);
  if (p === '/api/pool') return json(res, pool());

  const q = url.searchParams;
  const side = q.get('side') === '2' ? 2 : 1;
  const name = (q.get('name') || '').trim().slice(0, 80);
  if (p === '/api/pick' || p === '/api/entered') {
    if (!name) return json(res, state);
    const other = state[side === 1 ? 'p2' : 'p1'];
    if (p === '/api/pick' && same(name, other)) { swap(); entered(name); } // the other side's player: swap sides
    else state['p' + side] = entered(name);
    changed(); poolChanged();
    return json(res, state);
  }
  if (p === '/api/recent/remove') {
    players.recent = players.recent.filter((n) => !same(n, name));
    poolChanged();
    return json(res, pool());
  }
  if (p === '/api/image' && req.method === 'POST') {
    if (!name) return json(res, { error: 'name missing' }, 400);
    const chunks = [];
    let size = 0;
    req.on('data', (c) => {
      size += c.length;
      if (size <= IMAGE_MAX) chunks.push(c);
    });
    req.on('end', () => {
      if (size > IMAGE_MAX) return json(res, { error: 'image over 2 MB' }, 413);
      const png = Buffer.concat(chunks);
      if (!png.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return json(res, { error: 'not a PNG' }, 415);
      // File name not derived from the player name, so any characters work on Windows
      const file = players.images[key(name)] || `${randomBytes(6).toString('hex')}.png`;
      fs.mkdirSync(imageDir, { recursive: true });
      fs.writeFileSync(path.join(imageDir, file), png);
      players.images[key(name)] = file;
      changed(); poolChanged();
      json(res, pool());
    });
    return;
  }
  if (p === '/api/image/delete') {
    const file = players.images[key(name)];
    if (file) fs.rm(path.join(imageDir, file), { force: true }, () => {});
    delete players.images[key(name)];
    changed(); poolChanged();
    return json(res, pool());
  }
  if (p === '/api/set') {
    for (const k of textFields) if (q.has(k)) state[k] = q.get(k).slice(0, 80);
    if (q.has('score')) state.score = q.get('score') === '1' || q.get('score') === 'true';
    for (const k of ['s1', 's2', 'ft']) {
      const v = parseInt(q.get(k), 10);
      if (!Number.isNaN(v)) state[k] = v;
    }
    state.ft = Math.max(1, Math.min(99, state.ft));
    state.s1 = clamp(state.s1); state.s2 = clamp(state.s2);
    changed();
    return json(res, state);
  }
  const action = actions[p.replace(/^\/api\//, '')];
  if (p.startsWith('/api/') && action) { action(); changed(); return json(res, state); }
  if (p.startsWith('/api/')) return json(res, { error: 'unknown action' }, 404);

  // Static files; player images from players/
  const root = p.startsWith('/players/') ? imageDir : staticDir;
  const file = path.join(root, path.normalize(p === '/' ? '/control.html' : p.replace(/^\/players\//, '/')));
  if (!file.startsWith(root + path.sep)) { res.writeHead(403); return res.end(); }
  fs.readFile(file, (err, data) => {
    if (err) { res.writeHead(404); return res.end('not found'); }
    res.writeHead(200, { 'Content-Type': types[path.extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-cache' });
    res.end(data);
  });
}).listen(config.port, () => {
  startHotkeys();
  changed();
  loadFeed();
  setInterval(loadFeed, 5 * 60e3);
  setInterval(() => { if (rollDay()) poolChanged(); }, 60e3); // new session day at 06:00
  console.log(`MadGear overlays running on http://localhost:${config.port}`);
  console.log(`  Control panel: http://localhost:${config.port}/control.html`);
  console.log('  Keep this window open while streaming.');
});
