import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const sharedChessRulesPath = path.resolve(__dirname, '../shared/chess-rules.js');

// shared/chess-rules.js — общий с сервером и публичным тренажёром движок
// правил, НЕ копируется руками (см. index.html). Классический <script src>
// вне корня проекта Vite не резолвит (в отличие от ES-импортов внутри графа
// модулей), поэтому отдаём файл под стабильным URL /chess-rules.js сами —
// и в dev-сервере, и при сборке — читая его напрямую с диска каждый раз.
function chessRulesAsset() {
  return {
    name: 'chess-rules-asset',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        if (req.url === '/chess-rules.js') {
          res.setHeader('Content-Type', 'text/javascript');
          res.end(fs.readFileSync(sharedChessRulesPath));
          return;
        }
        next();
      });
    },
    generateBundle() {
      this.emitFile({ type: 'asset', fileName: 'chess-rules.js', source: fs.readFileSync(sharedChessRulesPath) });
    }
  };
}

// host: '127.0.0.1' — та же причина, что и в CSD-app/vite.config.js:
// на Windows Node слушает [::1] по умолчанию, а браузер стучится на IPv4
// 127.0.0.1 и получает connectionFailure.
export default defineConfig({
  plugins: [react(), chessRulesAsset()],
  base: './',
  server: { host: '127.0.0.1', port: 5189 },
  preview: { host: '127.0.0.1', port: 5189 }
});
