import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import expressApp from './server/index.ts';

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    {
      name: 'api-server-middleware',
      configureServer(server) {
        server.middlewares.use(expressApp);
      }
    }
  ],
  server: {
    host: true,
    port: 5173
  }
});
