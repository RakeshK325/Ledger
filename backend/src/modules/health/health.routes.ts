import { Router } from 'express';
import { healthController } from './health.controller';

const router = Router();

// GET /api/health
router.get('/health', healthController.getHealth);

export const healthRoutes = router;
