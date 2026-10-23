import { Request, Response, NextFunction } from 'express';
import { ZodSchema, ZodError } from 'zod';
import { AppError } from './error.middleware';

// Middleware generator to validate request body with Zod
export function validate(schema: ZodSchema) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.body);

    if (!result.success) {
      const firstError = result.error.errors[0]?.message || 'Invalid input data';
      return next(new AppError(400, 'VALIDATION_ERROR', firstError));
    }

    // Replace req.body with the parsed/transformed data
    req.body = result.data;
    next();
  };
}
