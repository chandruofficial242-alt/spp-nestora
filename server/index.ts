import fs from 'fs';
import path from 'path';
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

import { router } from './routes.ts';

const app = express();
const PORT = parseInt(process.env.PORT || '10000', 10);
const HOST = '0.0.0.0';

app.use(cors());
app.use(express.json({ limit: '50mb' }));
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

// 3. Serve static uploads (Disk storage fallback)
const uploadsPath = path.resolve(process.cwd(), 'uploads');
if (!fs.existsSync(uploadsPath)) {
  fs.mkdirSync(uploadsPath, { recursive: true });
}
app.use('/uploads', express.static(uploadsPath));

// 4. API Routes
app.use('/api', router);

// 5. Serve static client build (dist/) in production with SPA fallback
const distPath = path.resolve(process.cwd(), 'dist');
if (fs.existsSync(distPath)) {
  app.use(express.static(distPath));
}

app.use((req, res, next) => {
  if (req.method === 'GET' && !req.path.startsWith('/api') && !req.path.startsWith('/uploads') && req.path !== '/health') {
    const indexPath = path.join(distPath, 'index.html');
    if (fs.existsSync(indexPath)) {
      return res.sendFile(indexPath);
    }
  }
  next();
});

// 6. Bind to 0.0.0.0 and listen on PORT (process.env.PORT || 10000)
if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, HOST, () => {
    console.log(`[SPP Nestora] Production Server listening on ${HOST}:${PORT}`);
  });
}

export default app;
