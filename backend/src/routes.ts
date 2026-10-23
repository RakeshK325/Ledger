import { Router } from 'express';
import { healthRoutes } from './modules/health/health.routes';
import { authRoutes } from './modules/auth/auth.routes';
import { loansRoutes } from './modules/loans/loans.routes';
import { loansController } from './modules/loans/loans.controller';
import { authMiddleware } from './middlewares/auth.middleware';

const apiRouter = Router();

// Mount module routes
apiRouter.use('/', healthRoutes);
apiRouter.use('/auth', authRoutes);
apiRouter.use('/loans', loansRoutes);

// GET /api/summary (one SQL query aggregate summary)
apiRouter.get('/summary', authMiddleware, loansController.getSummary);

export const routes = apiRouter;
