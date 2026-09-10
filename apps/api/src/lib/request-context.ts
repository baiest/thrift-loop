import { AsyncLocalStorage } from 'node:async_hooks';

interface RequestContext {
  requestId: string;
  ip?: string;
}

const storage = new AsyncLocalStorage<RequestContext>();

export function runWithRequestId<T>(requestId: string, fn: () => T, ip?: string): T {
  return storage.run(ip ? { requestId, ip } : { requestId }, fn);
}

export function getRequestId(): string | undefined {
  return storage.getStore()?.requestId;
}

export function getIp(): string | undefined {
  return storage.getStore()?.ip;
}
