import dotenv from 'dotenv';
dotenv.config();

import { app } from './app.ts';

const PORT = parseInt(process.env.PORT || '10000', 10);
const HOST = '0.0.0.0';

if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, HOST, () => {
    console.log(`[SPP Nestora] Production Server listening on ${HOST}:${PORT}`);
  });
}

export default app;
