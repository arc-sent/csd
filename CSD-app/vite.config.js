import {defineConfig, loadEnv} from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

// Совпадает с APP_DOMAIN по умолчанию в docker-compose.yml. В Docker
// настоящий адрес приходит build-аргом VITE_SITE_URL (см. Dockerfile).
const DEFAULT_SITE_URL = 'https://app.31-76-46-113.sslip.io';

// robots.txt и sitemap.xml нельзя положить в public/ статикой — в них нужен
// абсолютный адрес сайта, а он известен только при сборке. Кабинет
// (?view=cabinet) закрыт от индексации: это личные экраны за логином, и
// поисковику там показывать нечего, кроме «войдите».
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

// host: '127.0.0.1' — иначе Node на Windows слушает только IPv6 [::1],
// а браузер идёт на IPv4 127.0.0.1 и получает connectionFailure.
export default defineConfig(({mode}) => {
  const env = loadEnv(mode, process.cwd(), 'VITE_');
  const siteUrl = (env.VITE_SITE_URL || DEFAULT_SITE_URL).replace(/\/$/, '');
  // Vite подставляет %VITE_SITE_URL% в index.html из окружения — значение по
  // умолчанию должно попасть туда же, иначе плейсхолдер останется в HTML.
  process.env.VITE_SITE_URL = siteUrl;

  return {
    plugins: [react(), tailwindcss(), seoFiles(siteUrl)],
    base: './',
    server: {host: '127.0.0.1', port: 5173},
    preview: {host: '127.0.0.1', port: 4173}
  };
});
