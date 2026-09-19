import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const sharedChessRulesPath = path.resolve(__dirname, '../shared/chess-rules.js');

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

export default defineConfig({
  plugins: [react(), chessRulesAsset()],
  base: './',
  server: { host: '127.0.0.1', port: 5189 },
  preview: { host: '127.0.0.1', port: 5189 },
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/setupTests.js'],
    globals: true
  }
});
