import { Request, Response, NextFunction } from 'express';
import { authService } from './auth.service';

export class AuthController {
  // POST /api/auth/request-otp
  public async requestOtp(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { phone } = req.body;
      const result = await authService.requestOtp(phone);
      res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  }

  // POST /api/auth/verify-otp
  public async verifyOtp(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { phone, code } = req.body;
      const result = await authService.verifyOtp(phone, code);
      res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  }

  // GET /api/auth/me (Protected test route)
  public async getMe(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = await authService.getUserById(req.userId!);
      res.status(200).json({ user });
    } catch (err) {
      next(err);
    }
  }

  // GET /api/auth/test (Protected test route)
  public async getTest(req: Request, res: Response): Promise<void> {
    res.status(200).json({ ok: true, userId: req.userId });
  }
}

export const authController = new AuthController();
