import { defineConfig } from 'astro/config';

export default defineConfig({
  site: 'https://madgear.org',
  // Emit /anfahrt.html etc. so links to the old Jekyll URLs keep working.
  build: { format: 'file' },
});
