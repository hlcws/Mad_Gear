// Logo files are optional: prefer SVG, fall back to PNG, else null (caller shows text).
import { existsSync } from 'node:fs';

export function logo(name) {
  for (const ext of ['svg', 'png', 'webp']) {
    if (existsSync(`public/${name}.${ext}`)) return `/${name}.${ext}`;
  }
  return null;
}
