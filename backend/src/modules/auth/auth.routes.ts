import { Router } from 'express';
import { authController } from './auth.controller';
import { validate } from '../../middlewares/validate.middleware';
import { authMiddleware } from '../../middlewares/auth.middleware';
import { requestOtpSchema, verifyOtpSchema } from '../../schemas/auth.schema';

const router = Router();

// Public routes
router.post('/request-otp', validate(requestOtpSchema), authController.requestOtp);
router.post('/verify-otp', validate(verifyOtpSchema), authController.verifyOtp);

// Protected routes (require valid Bearer token)
router.get('/me', authMiddleware, authController.getMe);
router.get('/test', authMiddleware, authController.getTest);

export const authRoutes = router;
