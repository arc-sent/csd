import {defineConfig} from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

// host: '127.0.0.1' — иначе Node на Windows слушает только IPv6 [::1],
// а браузер идёт на IPv4 127.0.0.1 и получает connectionFailure.
export default defineConfig({
  plugins: [react(), tailwindcss()],
  base: './',
  server: {host: '127.0.0.1', port: 5173},
  preview: {host: '127.0.0.1', port: 4173}
});
