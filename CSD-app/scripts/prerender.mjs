import {build} from 'vite';
import {readFile, rm, writeFile} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath, pathToFileURL} from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dist = path.join(root, 'dist');
const serverDir = path.join(dist, '.server');

await build({root});
await build({
  root,
  build: {ssr: 'src/entry-server.jsx', outDir: serverDir, emptyOutDir: true},
  logLevel: 'warn'
});

const {render} = await import(pathToFileURL(path.join(serverDir, 'entry-server.js')).href);
const mount = '<div id="root"></div>';

// Каждая страница — свой физический index.html в dist (см. vite.config.js
// rollupOptions.input) и свой серверный рендер под свой путь, чтобы у
// краулера не оставалось пустого <div id="root"> без JS.
const pages = [
  {file: 'index.html', ssrPath: '/'},
  {file: 'metodika/index.html', ssrPath: '/metodika'}
];

for (const {file, ssrPath} of pages) {
  const filePath = path.join(dist, file);
  const template = await readFile(filePath, 'utf8');
  if (!template.includes(mount)) throw new Error(`В dist/${file} не найден ${mount}`);
  const html = render(ssrPath);
  await writeFile(filePath, template.replace(mount, `<div id="root">${html}</div>`));
  console.log(`Пререндер: ${ssrPath} вставлен в dist/${file} (${(html.length / 1024).toFixed(1)} kB HTML)`);
}

await rm(serverDir, {recursive: true, force: true});
