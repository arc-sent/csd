// Сборка сайта с пререндером лендинга: обычный клиентский `vite build`, затем
// SSR-сборка src/entry-server.jsx, рендер <App/> в строку и вставка результата
// в dist/index.html вместо пустого <div id="root">. Поисковики (особенно
// Яндекс, который плохо выполняет JS) получают готовый HTML с h1, текстами и
// FAQ, а браузер его гидрирует (см. src/main.jsx). Запускается через
// `npm run build` — и локально, и в Docker.
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
