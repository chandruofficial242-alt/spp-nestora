import path from 'path';
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

import { router } from './routes.ts';

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Serve static uploads
const uploadsPath = path.resolve(process.cwd(), 'uploads');
app.use('/uploads', express.static(uploadsPath));

// Health Check
app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    app: 'SPP Nestora Real-Estate Production API Server',
    tagline: 'Find Your Place. Build Your Future.',
    timestamp: new Date().toISOString()
  });
});

// API Routes
app.use('/api', router);

// Start server if executed directly
if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => {
    console.log(`[SPP Nestora] API Server running on http://localhost:${PORT}`);
  });
}

export default app;
