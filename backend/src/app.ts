import express, { Application } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import { env } from './config/env';
import agentRoutes from './routes/agent.routes';
import { AppError } from './utils/appError';
import { logger } from './utils/logger';

export function createApp(): Application {
  const app = express();

  app.disable('x-powered-by');
  app.use(helmet());
  app.use(cors({ origin: env.corsOrigins }));
  app.use(express.json({ limit: '1mb' }));

  app.get('/', (_req, res) => {
    res.status(200).json({ success: true, data: { name: 'Purple Fabric Agent Directory API' } });
  });

  app.use(`${env.apiPrefix}/agents`, agentRoutes);

  app.use((_req, _res, next) => {
    next(AppError.notFound('Route not found'));
  });

  app.use((error: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    const appError = error instanceof AppError ? error : AppError.internal('Unexpected server error');
    if (!(error instanceof AppError)) {
      logger.error('Unhandled request error', { error });
    }

    res.status(appError.statusCode).json({
      success: false,
      message: appError.message,
      errors: appError.errors,
    });
  });

  return app;
}

export default createApp();
