import type { Request, RequestHandler, Response } from 'express';
import { HttpError } from './http-error.js';
import { HTTP_STATUS } from './http-status.js';
import { NOOP_LOGGER, type Logger } from './logger.js';

const UNEXPECTED_ERROR_MESSAGE = 'Something went wrong';

export function createAsyncHandler(logger: Logger) {
  return function asyncHandler(
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
        logger.critical('unexpected_route_error', {
          message: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined,
          route: req.path,
        });
        res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ error: UNEXPECTED_ERROR_MESSAGE });
      });
    };
  };
}

let defaultLogger: Logger = NOOP_LOGGER;

/**
 * Swaps the logger used by the shared `asyncHandler` export. Called once from
 * the composition root (index.ts) so route files can keep importing the
 * plain `asyncHandler` without threading a logger through every router.
 */
export function setDefaultAsyncHandlerLogger(logger: Logger): void {
  defaultLogger = logger;
}

export const asyncHandler: ReturnType<typeof createAsyncHandler> = (handler) =>
  createAsyncHandler(defaultLogger)(handler);
