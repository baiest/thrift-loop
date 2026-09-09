import http from 'node:http';
import { createApp, type CreateAppOptions } from './create-app.js';
import { attachRealtime } from './realtime/realtime-server.js';
import type { EventBus } from './lib/event-bus.js';
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
  const appOptions: CreateAppOptions = notificationService
    ? { ...rest, notificationService }
    : rest;
  const server = http.createServer(createApp(appOptions));
  const realtime = attachRealtime(server, { allowedOrigins });

  const detachFanout =
    eventBus && notificationService
      ? attachEventFanout(eventBus, realtime.hub, notificationService)
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
