// Renders the static frame PNGs (overlays/frames/*.png) from the overlay pages.
// Run after changing config.json texts/socials or the page designs:   node render-frames.mjs
// Uses Microsoft Edge (or Chrome) in headless mode, no extra installs.

import { spawn, execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';

const dir = path.dirname(fileURLToPath(import.meta.url));
const { port } = JSON.parse(fs.readFileSync(path.join(dir, 'config.json'), 'utf8'));
const base = `http://localhost:${port}/`;
const outDir = path.join(dir, 'overlays', 'frames');

const frames = {
  'match.png': 'match.html?part=frame',
  'fullscreen.png': 'fullscreen.html?part=frame',
  'starting.png': 'screen.html?mode=starting&part=frame',
  'break.png': 'screen.html?mode=break&part=frame',
  'ending.png': 'screen.html?mode=ending&part=frame',
};

const browsers = [
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  'C:/Program Files/Microsoft/Edge/Application/msedge.exe',
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
];
const browser = browsers.find((b) => fs.existsSync(b));
if (!browser) throw new Error('Edge or Chrome not found');

const up = () => fetch(base + 'api/state').then(() => true, () => false);

// Use the running server, or start one just for rendering
let server;
if (!(await up())) {
  server = spawn(process.execPath, [path.join(dir, 'server.mjs')], { env: { ...process.env, MADGEAR_NO_HOTKEYS: '1' }, stdio: 'ignore' });
  for (let i = 0; i < 50 && !(await up()); i++) await new Promise((r) => setTimeout(r, 100));
}

fs.mkdirSync(outDir, { recursive: true });
try {
  for (const [file, url] of Object.entries(frames)) {
    // fresh profile per shot: Edge keeps the previous one locked for a moment
    const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'madgear-render-'));
    execFileSync(browser, [
      '--headless=new', '--disable-gpu', '--hide-scrollbars', '--no-first-run',
      `--user-data-dir=${profile}`, '--window-size=1920,1080', '--force-device-scale-factor=1',
      '--default-background-color=00000000', '--virtual-time-budget=4000',
      `--screenshot=${path.join(outDir, file)}`, base + url,
    ], { stdio: 'ignore', timeout: 30000 });
    console.log('rendered', file);
    setTimeout(() => fs.rm(profile, { recursive: true, force: true, maxRetries: 5 }, () => {}), 2000);
  }
} finally {
  server?.kill();
}
