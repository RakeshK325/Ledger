import { Request, Response, NextFunction } from 'express';
import { loansService, LoanStatus } from './loans.service';
import { CreateLoanInput } from '../../schemas/loan.schema';

export class LoansController {
  // POST /api/loans (multipart/form-data)
  public async createLoan(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = req.body as CreateLoanInput;
      const loan = await loansService.createLoan(req.userId!, data, req.file);
      res.status(201).json({ loan });
    } catch (err) {
      next(err);
    }
  }

  // GET /api/loans?status=
  public async getLoans(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const statusFilter = req.query.status as LoanStatus | undefined;
      const loans = await loansService.getLoans(req.userId!, statusFilter);
      res.status(200).json({ loans });
    } catch (err) {
      next(err);
    }
  }

  // PATCH /api/loans/:id/repay
  public async repayLoan(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const loan = await loansService.repayLoan(req.userId!, id);
      res.status(200).json({ loan });
    } catch (err) {
      next(err);
    }
  }

  // GET /api/summary
  public async getSummary(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const summary = await loansService.getSummary(req.userId!);
      res.status(200).json(summary);
    } catch (err) {
      next(err);
    }
  }
}

export const loansController = new LoansController();
