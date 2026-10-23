import { Router } from 'express';
import { loansController } from './loans.controller';
import { authMiddleware } from '../../middlewares/auth.middleware';
import { uploadReceipt } from '../../middlewares/upload.middleware';
import { validate } from '../../middlewares/validate.middleware';
import { createLoanSchema } from '../../schemas/loan.schema';

const router = Router();

// All loan routes require authentication
router.use(authMiddleware);

// POST /api/loans (multipart/form-data)
router.post('/', uploadReceipt, validate(createLoanSchema), loansController.createLoan);

// GET /api/loans (optional ?status= filter)
router.get('/', loansController.getLoans);

// PATCH /api/loans/:id/repay
router.patch('/:id/repay', loansController.repayLoan);

export const loansRoutes = router;
