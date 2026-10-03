import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    {
      name: 'api-server-middleware',
      configureServer(server) {
        return async () => {
          const { app } = await import('./server/app.ts');
          server.middlewares.use(app);
        };
      }
    }
  ],
  server: {
    host: true,
    port: 5173
  }
});
