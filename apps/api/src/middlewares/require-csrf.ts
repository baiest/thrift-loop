import type { NextFunction, Request, Response } from 'express';
import { csrfProtection } from '../lib/csrf.js';

export function requireCsrf(req: Request, res: Response, next: NextFunction): void {
  csrfProtection(req, res, next);
}
