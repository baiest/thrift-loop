import type { RequestHandler } from 'express';
import { performance } from 'node:perf_hooks';
import type { Logger, LogLevel } from '../lib/logger.js';
import { createPrefixedId } from '../lib/prefixed-id.js';
import { runWithRequestId } from '../lib/request-context.js';

const CRITICAL_STATUS_THRESHOLD = 500;
const WARNING_STATUS_THRESHOLD = 400;

function levelForStatus(status: number): LogLevel {
  if (status >= CRITICAL_STATUS_THRESHOLD) {
    return 'critical';
  }
  if (status >= WARNING_STATUS_THRESHOLD) {
    return 'warning';
  }
  return 'info';
}

export function createRequestLoggingMiddleware(logger: Logger): RequestHandler {
  return (req, res, next) => {
    runWithRequestId(
      createPrefixedId('REQ'),
      () => {
        const start = performance.now();
        res.on('finish', () => {
          const level = levelForStatus(res.statusCode);
          // level comes from levelForStatus's fixed return type, not request data.
          // eslint-disable-next-line security/detect-object-injection
          logger[level]('http_request', {
            method: req.method,
            path: req.path,
            status: res.statusCode,
            durationMs: performance.now() - start,
          });
        });
        // 'close' also fires after a normal 'finish'; only an aborted connection
        // reaches here without ever sending headers, so guard on that.
        res.on('close', () => {
          if (res.headersSent) {
            return;
          }
          logger.warning('http_request_aborted', {
            method: req.method,
            path: req.path,
            durationMs: performance.now() - start,
          });
        });
        next();
      },
      req.ip,
    );
  };
}
