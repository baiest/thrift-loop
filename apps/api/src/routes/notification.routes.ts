import { Router } from 'express';
import { type NotificationPreferences } from '@thrift-loop/shared';
import { asyncHandler } from '../lib/async-handler.js';
import { pickPresentBooleanFields } from '../lib/request-body.js';
import { requireAuth } from '../middlewares/require-auth.js';
import { requireCsrf } from '../middlewares/require-csrf.js';
import type { NotificationService } from '../services/notification.service.js';
import { HTTP_STATUS } from '../lib/http-status.js';

const PREFERENCE_FIELDS = [
  'outbid',
  'auctionWon',
  'bidOnMyListing',
] as const satisfies readonly (keyof NotificationPreferences)[];

export function createNotificationRouter(notificationService: NotificationService): Router {
  const router = Router();

  router.get(
    '/',
    requireAuth,
    asyncHandler(async (_req, res) => {
      const userId = res.locals['userId'] as string;
      const { notifications, unreadCount } = await notificationService.list(userId);
      res.status(HTTP_STATUS.OK).json({ notifications, unreadCount });
    }),
  );

  router.post(
    '/read-all',
    requireAuth,
    requireCsrf,
    asyncHandler(async (_req, res) => {
      const userId = res.locals['userId'] as string;
      const updated = await notificationService.markAllRead(userId);
      res.status(HTTP_STATUS.OK).json({ updated });
    }),
  );

  router.post(
    '/:id/read',
    requireAuth,
    requireCsrf,
    asyncHandler(async (req, res) => {
      const userId = res.locals['userId'] as string;
      const notification = await notificationService.markRead(userId, req.params['id'] as string);
      res.status(HTTP_STATUS.OK).json({ notification });
    }),
  );

  router.patch(
    '/preferences',
    requireAuth,
    requireCsrf,
    asyncHandler(async (req, res) => {
      const userId = res.locals['userId'] as string;
      const patch = pickPresentBooleanFields<NotificationPreferences>(req.body, PREFERENCE_FIELDS);
      const user = await notificationService.updatePreferences(userId, patch);
      res.status(HTTP_STATUS.OK).json({ user });
    }),
  );

  return router;
}
