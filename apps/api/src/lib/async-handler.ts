import type { Request, RequestHandler, Response } from 'express';
import { HttpError } from './http-error.js';
import { HTTP_STATUS } from './http-status.js';

const UNEXPECTED_ERROR_MESSAGE = 'Something went wrong';

export function asyncHandler(
  handler: (req: Request, res: Response) => Promise<void>,
): RequestHandler {
  return (req, res) => {
    handler(req, res).catch((error: unknown) => {
      if (error instanceof HttpError) {
        res.status(error.status).json({ error: error.message, fields: error.fields });
        return;
      }
      // Express 4 does not catch rejections thrown from an async handler on
      // its own, so an unexpected error must be turned into a response here.
      console.error('Unexpected route error', error);
      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ error: UNEXPECTED_ERROR_MESSAGE });
    });
  };
}
