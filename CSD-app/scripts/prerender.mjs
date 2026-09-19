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
const appHtml = render();

const indexPath = path.join(dist, 'index.html');
const template = await readFile(indexPath, 'utf8');
const mount = '<div id="root"></div>';
if (!template.includes(mount)) throw new Error(`В dist/index.html не найден ${mount}`);
await writeFile(indexPath, template.replace(mount, `<div id="root">${appHtml}</div>`));
await rm(serverDir, {recursive: true, force: true});

console.log(`Пререндер: лендинг вставлен в dist/index.html (${(appHtml.length / 1024).toFixed(1)} kB HTML)`);
