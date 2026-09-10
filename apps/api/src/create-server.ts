import http from 'node:http';
import { createApp, type CreateAppOptions } from './create-app.js';
import { attachRealtime } from './realtime/realtime-server.js';
import type { EventBus } from './lib/event-bus.js';
import { NOOP_LOGGER } from './lib/logger.js';
import type { NotificationService } from './services/notification.service.js';
import { attachEventFanout } from './realtime/event-fanout.js';

export interface CreateServerOptions extends CreateAppOptions {
  allowedOrigins: readonly string[];
  eventBus?: EventBus;
  notificationService?: NotificationService;
}

export interface RunningServer {
  server: http.Server;
  close: () => Promise<void>;
}

export function createServer(options: CreateServerOptions): RunningServer {
  const { allowedOrigins, eventBus, notificationService, ...rest } = options;
  const logger = rest.logger ?? NOOP_LOGGER;
  const appOptions: CreateAppOptions = notificationService
    ? { ...rest, notificationService }
    : rest;
  const server = http.createServer(createApp(appOptions));
  const realtime = attachRealtime(server, { allowedOrigins }, logger);

  const detachFanout =
    eventBus && notificationService
      ? attachEventFanout(eventBus, realtime.hub, notificationService, logger)
      : null;

  return {
    server,
    close() {
      detachFanout?.();
      realtime.close();
      return new Promise((resolve, reject) => {
        server.close((error) => (error ? reject(error) : resolve()));
      });
    },
  };
}
