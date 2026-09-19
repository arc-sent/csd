import {defineConfig, loadEnv} from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

const DEFAULT_SITE_URL = 'https://app.31-76-46-113.sslip.io';

function seoFiles(siteUrl) {
  const robots = `User-agent: *\nAllow: /\nDisallow: /*?view=cabinet\n\nSitemap: ${siteUrl}/sitemap.xml\n`;
  const sitemap =
    `<?xml version="1.0" encoding="UTF-8"?>\n` +
    `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
    `  <url><loc>${siteUrl}/</loc><changefreq>weekly</changefreq><priority>1.0</priority></url>\n` +
    `</urlset>\n`;
  const files = {'/robots.txt': ['text/plain', robots], '/sitemap.xml': ['application/xml', sitemap]};
  return {
    name: 'seo-files',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const hit = files[req.url];
        if (!hit) return next();
        res.setHeader('Content-Type', hit[0]);
        res.end(hit[1]);
      });
    },
    generateBundle() {
      for (const [url, [, source]] of Object.entries(files)) {
        this.emitFile({type: 'asset', fileName: url.slice(1), source});
      }
    }
  };
}

export default defineConfig(({mode}) => {
  const env = loadEnv(mode, process.cwd(), 'VITE_');
  const siteUrl = (env.VITE_SITE_URL || DEFAULT_SITE_URL).replace(/\/$/, '');
  process.env.VITE_SITE_URL = siteUrl;

  return {
    plugins: [react(), tailwindcss(), seoFiles(siteUrl)],
    base: './',
    server: {host: '127.0.0.1', port: 5173},
    preview: {host: '127.0.0.1', port: 4173}
  };
});
