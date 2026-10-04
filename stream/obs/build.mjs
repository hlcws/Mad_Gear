// Builds obs/MadGear.json (OBS scene collection) from overlays/scenes.json,
// with absolute paths to wherever this folder lives. start.bat runs it every time,
// so after moving the folder: start once, then re-import in OBS.

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const overlays = path.join(root, 'overlays');
const { port } = JSON.parse(fs.readFileSync(path.join(root, 'config.json'), 'utf8'));
const scenes = JSON.parse(fs.readFileSync(path.join(overlays, 'scenes.json'), 'utf8'));
delete scenes._comment;

const sources = new Map(); // one OBS source per unique layer, shared between scenes
const source = (key, name, id, settings, extra = {}) => {
  if (!sources.has(key)) {
    sources.set(key, {
      name, uuid: crypto.randomUUID(), id, versioned_id: id, settings,
      mixers: 0, sync: 0, flags: 0, volume: 1.0, balance: 0.5, enabled: true, muted: false,
      'push-to-mute': false, 'push-to-mute-delay': 0, 'push-to-talk': false, 'push-to-talk-delay': 0,
      hotkeys: {}, deinterlace_mode: 0, deinterlace_field_order: 0, monitoring_type: 0, private_settings: {}, ...extra,
    });
  }
  return sources.get(key);
};
const browserBase = { fps_custom: false, reroute_audio: false, shutdown: false, restart_when_active: false, css: '' };

function layerSource(layer, [, , w, h]) {
  switch (layer.type) {
    case 'game': return source('game', 'Game Capture', 'dshow_input', {}, { mixers: 255 });
    case 'cam': return source('cam', 'Player Cam', 'dshow_input', {});
    case 'image': {
      const name = 'Frame · ' + path.basename(layer.file, '.png');
      return source(layer.file, name, 'image_source', { file: path.join(overlays, layer.file).replaceAll('\\', '/') });
    }
    case 'file': { // standalone pages (chat, sessions): local file, no server needed
      const name = { 'chat.html': 'Chat', 'session.html': 'Sessions' }[layer.file] || layer.file;
      return source(`${layer.file}@${w}x${h}`, `${name} ${w}x${h}`, 'browser_source',
        { ...browserBase, is_local_file: true, local_file: path.join(overlays, layer.file).replaceAll('\\', '/'), width: w, height: h });
    }
    case 'score':
      return source(layer.url, 'Score · ' + (layer.url.match(/mode=(\w+)/)?.[1] || layer.url.split('.html')[0]), 'browser_source',
        { ...browserBase, url: `http://localhost:${port}/${layer.url}`, width: 1920, height: 1080 });
  }
}

let n = 0;
const sceneSources = Object.entries(scenes).map(([name, layers]) => {
  const items = layers.map((layer, i) => {
    const rect = layer.rect || [0, 0, 1920, 1080];
    const s = layerSource(layer, rect);
    const fit = layer.type === 'game' || layer.type === 'cam'; // scale devices into their box
    return {
      name: s.name, source_uuid: s.uuid, visible: true, locked: true, rot: 0.0,
      pos: { x: rect[0], y: rect[1] }, scale: { x: 1.0, y: 1.0 }, align: 5,
      bounds_type: fit ? 2 : 0, bounds_align: 0, bounds: { x: rect[2], y: rect[3] },
      crop_left: 0, crop_top: 0, crop_right: 0, crop_bottom: 0, id: i + 1, group_item_backup: false,
      scale_filter: 'disable', blend_method: 'default', blend_type: 'normal',
      show_transition: { duration: 0 }, hide_transition: { duration: 0 }, private_settings: {},
    };
  });
  // Scene hotkeys Ctrl+Alt+Shift+F1, F2, ...
  return source('scene:' + name, name, 'scene', { id_counter: items.length, custom_size: false, items },
    { hotkeys: { 'OBSBasic.SelectScene': [{ control: true, alt: true, shift: true, key: 'OBS_KEY_F' + ++n }] } });
});

const out = {
  name: 'MadGear', current_scene: sceneSources[0].name, current_program_scene: sceneSources[0].name,
  scene_order: sceneSources.map((s) => ({ name: s.name })),
  // inputs first, scenes last (scenes reference them)
  sources: [...sources.values()].filter((s) => s.id !== 'scene').concat(sceneSources),
  groups: [], quick_transitions: [], transitions: [], saved_projectors: [],
  current_transition: 'Fade', transition_duration: 300, preview_locked: false,
  scaling_enabled: false, scaling_level: 0, scaling_off_x: 0.0, scaling_off_y: 0.0, modules: {},
};
fs.writeFileSync(path.join(root, 'obs', 'MadGear.json'), JSON.stringify(out, null, 2));
console.log(`OBS collection: ${path.join(root, 'obs', 'MadGear.json')}`);
