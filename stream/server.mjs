// MadGear stream overlays: tiny local server, no dependencies.
// Only the live scoreboard depends on it: it keeps the score, pushes changes to the
// score layers (OBS browser sources) via Server-Sent Events and listens for deck hotkeys.
// Frames are PNGs, chat and sessions are standalone files: they work without this server.
//
//   node server.mjs        then open http://localhost:8123/control.html
//
// Streamdeck: every action is a plain GET, e.g. http://localhost:8123/api/p1/plus

import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import readline from 'node:readline';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const dir = path.dirname(fileURLToPath(import.meta.url));
const config = JSON.parse(fs.readFileSync(path.join(dir, 'config.json'), 'utf8'));
const stateFile = path.join(dir, 'state.json');
const staticDir = path.join(dir, 'overlays');

const d = config.defaults;
let state = { p1: d.p1, p2: d.p2, s1: 0, s2: 0, ft: d.ft, title: d.title };
try {
  const saved = JSON.parse(fs.readFileSync(stateFile, 'utf8'));
  for (const k in state) if (k in saved) state[k] = saved[k];
} catch {}

const clients = new Set();
function changed() {
  fs.writeFile(stateFile, JSON.stringify(state, null, 2), () => {});
  const msg = `data: ${JSON.stringify(state)}\n\n`;
  for (const res of clients) res.write(msg);
}

const clamp = (n) => Math.max(0, Math.min(state.ft, n));
const actions = {
  'p1/plus': () => { state.s1 = clamp(state.s1 + 1); },
  'p1/minus': () => { state.s1 = clamp(state.s1 - 1); },
  'p2/plus': () => { state.s2 = clamp(state.s2 + 1); },
  'p2/minus': () => { state.s2 = clamp(state.s2 - 1); },
  reset: () => { state.s1 = 0; state.s2 = 0; },
  swap: () => { [state.p1, state.p2, state.s1, state.s2] = [state.p2, state.p1, state.s2, state.s1]; },
  'ft/plus': () => { state.ft = Math.min(99, state.ft + 1); },
  'ft/minus': () => { state.ft = Math.max(1, state.ft - 1); state.s1 = clamp(state.s1); state.s2 = clamp(state.s2); },
};
const textFields = ['p1', 'p2', 'title'];

// Windows: global hotkeys Ctrl+Alt+Shift+1..6 for decks that can only send key presses.
const hotkeyActions = ['p1/plus', 'p1/minus', 'p2/plus', 'p2/minus', 'reset', 'swap'];
function startHotkeys() {
  if (process.platform !== 'win32' || process.env.MADGEAR_NO_HOTKEYS) return;
  const ps = spawn('powershell.exe', ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', path.join(dir, 'hotkeys.ps1'), ...hotkeyActions], { windowsHide: true });
  readline.createInterface({ input: ps.stdout }).on('line', (line) => {
    line = line.trim();
    if (line === 'ready') console.log('  Hotkeys: Ctrl+Alt+Shift+1..6 = P1+ P1- P2+ P2- Reset Swap');
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
    clients.add(res);
    const ping = setInterval(() => res.write(': ping\n\n'), 20e3);
    req.on('close', () => { clearInterval(ping); clients.delete(res); });
    return;
  }
  if (p === '/api/state') return json(res, state);
  if (p === '/api/config') return json(res, config);
  if (p === '/api/set') {
    for (const k of textFields) if (url.searchParams.has(k)) state[k] = url.searchParams.get(k).slice(0, 80);
    for (const k of ['s1', 's2', 'ft']) {
      const v = parseInt(url.searchParams.get(k), 10);
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

  // Static files
  const file = path.join(staticDir, path.normalize(p === '/' ? '/control.html' : p));
  if (!file.startsWith(staticDir)) { res.writeHead(403); return res.end(); }
  fs.readFile(file, (err, data) => {
    if (err) { res.writeHead(404); return res.end('not found'); }
    res.writeHead(200, { 'Content-Type': types[path.extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-cache' });
    res.end(data);
  });
}).listen(config.port, () => {
  startHotkeys();
  console.log(`MadGear overlays running on http://localhost:${config.port}`);
  console.log(`  Control panel: http://localhost:${config.port}/control.html`);
  console.log('  Keep this window open while streaming.');
});
