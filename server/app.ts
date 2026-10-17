import fs from 'fs';
import path from 'path';
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

import { router } from './routes.ts';

const app = express();

app.use(cors());
app.use(express.json({
  limit: '50mb',
  verify: (req: any, _res, buf) => {
    req.rawBody = buf;
  }
}));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// 1. Simple /health endpoint returning HTTP 200 and "OK" (Render Health Check requirement)
app.get('/health', (_req, res) => {
  res.status(200).send('OK');
});

// 2. JSON /api/health endpoint for API clients
app.get('/api/health', (_req, res) => {
  res.status(200).json({
    status: 'ok',
    app: 'SPP Nestora Real-Estate Production API Server',
    tagline: 'Find Your Place. Build Your Future.',
    timestamp: new Date().toISOString()
  });
});

// 3. Serve static uploads (Disk storage fallback) & public assets (qr.jpg)
const uploadsPath = path.resolve(process.cwd(), 'uploads');
if (!fs.existsSync(uploadsPath)) {
  fs.mkdirSync(uploadsPath, { recursive: true });
}
app.use('/uploads', express.static(uploadsPath));

const publicPath = path.resolve(process.cwd(), 'public');
if (fs.existsSync(publicPath)) {
  app.use(express.static(publicPath));
}

// 4. API Routes
app.use('/api', router);

// Aliases for Google OAuth callback if accessed without /api prefix
app.get('/auth/google', (_req, res) => res.redirect('/api/auth/google'));
app.get('/auth/google/callback', (req, res) => {
  const query = new URLSearchParams(req.query as any).toString();
  res.redirect(`/api/auth/google/callback${query ? `?${query}` : ''}`);
});

// 5. Serve static client build (dist/) in production with SPA fallback and cache optimization
const distPath = path.resolve(process.cwd(), 'dist');
if (fs.existsSync(distPath)) {
  // Hashed Vite static assets (immutable 1 year caching)
  const assetsPath = path.join(distPath, 'assets');
  if (fs.existsSync(assetsPath)) {
    app.use('/assets', express.static(assetsPath, {
      maxAge: '1y',
      immutable: true
    }));
  }

  // Root static files (favicon, robots, etc.) with no-cache on HTML
  app.use(express.static(distPath, {
    setHeaders: (res, filePath) => {
      if (filePath.endsWith('.html')) {
        res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
        res.setHeader('Pragma', 'no-cache');
        res.setHeader('Expires', '0');
      }
    }
  }));
}

app.use((req, res, next) => {
  if (
    req.method === 'GET' &&
    !req.path.startsWith('/api') &&
    !req.path.startsWith('/uploads') &&
    !req.path.startsWith('/auth') &&
    req.path !== '/health'
  ) {
    const indexPath = path.join(distPath, 'index.html');
    if (fs.existsSync(indexPath)) {
      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
      return res.sendFile(indexPath);
    }
  }
  next();
});

export default app;
export { app };
