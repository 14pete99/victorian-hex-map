import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// The demo is static and client-side only.
export default defineConfig({
  plugins: [react()],
  server: { port: 5183, host: '127.0.0.1' },
});
