import { Request, Response } from 'express';
import { healthService } from './health.service';

export class HealthController {
  public getHealth(_req: Request, res: Response): void {
    const status = healthService.checkHealth();
    res.status(200).json(status);
  }
}

export const healthController = new HealthController();
