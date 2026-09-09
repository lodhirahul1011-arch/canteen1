import app from './app.js';
import env from './config/env.js';
import logger from './config/logger.js';
import { connectDB } from './config/db.js';

async function start() {
  await connectDB();

  const server = app.listen(env.port, () => {
    logger.info({ port: env.port, env: env.nodeEnv }, 'API server started');
  });

  const shutdown = async (signal) => {
    logger.info({ signal }, 'Shutdown requested');
    server.close(async () => {
      const mongoose = await import('mongoose');
      await mongoose.default.disconnect();
      process.exit(0);
    });
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

start().catch((error) => {
  logger.fatal({ err: error }, 'Failed to start server');
  process.exit(1);
});
