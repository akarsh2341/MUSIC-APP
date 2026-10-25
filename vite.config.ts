import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

// VITE_BASE lets the app be served from a sub-path (e.g. GitHub Pages: /repo-name/).
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', 'VITE_');
  return {
    base: env.VITE_BASE || '/',
    plugins: [react()],
    server: { port: 5173, host: true },
  };
});
