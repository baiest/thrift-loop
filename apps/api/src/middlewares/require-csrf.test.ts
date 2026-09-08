import { describe, expect, it, vi } from 'vitest';
import type { NextFunction, Request, Response } from 'express';
import * as csrfLib from '../lib/csrf.js';
import { requireCsrf } from './require-csrf.js';

describe('requireCsrf', () => {
  it('delegates to csrfProtection', () => {
    const spy = vi.spyOn(csrfLib, 'csrfProtection').mockImplementation((_req, _res, next) => {
      next();
    });
    const req = {} as Request;
    const res = {} as Response;
    const next = vi.fn() as NextFunction;

    requireCsrf(req, res, next);

    expect(spy).toHaveBeenCalledWith(req, res, next);
    spy.mockRestore();
  });
});
