import sharp from 'sharp';
import {readFile} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const out = file => path.join(root, 'public', file);

const knight = await readFile(out('pieces/wN.png'));

const ogSvg = `
<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <rect width="1200" height="630" fill="#1b1c19"/>
  <circle cx="1080" cy="560" r="300" fill="none" stroke="#363935" stroke-width="2"/>
  <circle cx="1180" cy="40" r="360" fill="#ff6b2d" fill-opacity=".12"/>
  <g font-family="Arial, Helvetica, sans-serif" fill="#f5f2ea">
    <text x="80" y="118" font-size="30" font-weight="700">
      <tspan fill="#ff6b2d">♞</tspan>
      <tspan dx="12">ChessSchool</tspan><tspan fill="#ff6b2d">Dinamik</tspan>
    </text>
    <text x="80" y="200" font-size="22" font-weight="700" fill="#9ea097" letter-spacing="4">ПЛАТФОРМА ДЛЯ ШАХМАТНОЙ ТАКТИКИ</text>
    <text x="80" y="300" font-size="72" font-weight="700" letter-spacing="-3">Начни <tspan fill="#ff6b2d">видеть</tspan></text>
    <text x="80" y="382" font-size="72" font-weight="700" letter-spacing="-3">комбинации на</text>
    <text x="80" y="464" font-size="72" font-weight="700" letter-spacing="-3">несколько ходов вперёд.</text>
    <text x="80" y="548" font-size="26" fill="#a0a29a">Интерактивная доска · проверка каждого хода · уровни сложности</text>
  </g>
</svg>`;

await sharp(Buffer.from(ogSvg))
  .composite([{input: await sharp(knight).resize(260, 260, {fit: 'inside'}).toBuffer(), left: 900, top: 330}])
  .png()
  .toFile(out('og.png'));

const iconSvg = `
<svg xmlns="http://www.w3.org/2000/svg" width="180" height="180" viewBox="0 0 180 180">
  <rect width="180" height="180" rx="40" fill="#1b1c19"/>
</svg>`;
await sharp(Buffer.from(iconSvg))
  .composite([{input: await sharp(knight).resize(120, 120, {fit: 'inside'}).toBuffer(), left: 30, top: 28}])
  .png()
  .toFile(out('apple-touch-icon.png'));

console.log('public/og.png и public/apple-touch-icon.png обновлены');
