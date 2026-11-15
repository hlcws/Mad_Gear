// /sitemap.xml: every page in this folder.
import { site } from '../site.config.mjs';

const pages = Object.keys(import.meta.glob('./*.{astro,md}'))
  .map((f) => f.replace(/^\.\/|\.(astro|md)$/g, ''))
  .map((p) => `${site.url}/${p === 'index' ? '' : `${p}.html`}`);

export const GET = () => new Response(
  `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${pages.map((url) => `  <url><loc>${url}</loc></url>`).join('\n')}
</urlset>
`,
  { headers: { 'Content-Type': 'application/xml' } },
);
