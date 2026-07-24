import { createApp } from './app';
import { env } from './config/env';
import { logger } from './utils/logger';

const app = createApp();

const server = app.listen(env.port, () => {
  logger.info(`Agent directory API listening on http://localhost:${env.port}`);
});

const shutdown = (signal: string): void => {
  logger.info(`Received ${signal}, shutting down`);
  server.close(() => process.exit(0));
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
