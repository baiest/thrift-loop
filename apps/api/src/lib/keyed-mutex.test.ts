import { describe, expect, it } from 'vitest';
import { createKeyedMutex } from './keyed-mutex.js';

function deferred<T>(): { promise: Promise<T>; resolve: (value: T) => void } {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((res) => {
    resolve = res;
  });
  return { promise, resolve };
}

describe('createKeyedMutex', () => {
  it('serializes tasks queued for the same key', async () => {
    const mutex = createKeyedMutex();
    const order: string[] = [];
    const first = deferred<void>();

    const taskA = mutex.runExclusive('auction-1', async () => {
      order.push('a-start');
      await first.promise;
      order.push('a-end');
    });
    const taskB = mutex.runExclusive('auction-1', () => {
      order.push('b-start');
      order.push('b-end');
      return Promise.resolve();
    });

    // Task B must not have started yet: task A is still holding the lock.
    await Promise.resolve();
    expect(order).toEqual(['a-start']);

    first.resolve();
    await Promise.all([taskA, taskB]);

    expect(order).toEqual(['a-start', 'a-end', 'b-start', 'b-end']);
  });

  it('runs tasks on different keys concurrently', async () => {
    const mutex = createKeyedMutex();
    const order: string[] = [];
    const first = deferred<void>();

    const taskA = mutex.runExclusive('auction-1', async () => {
      order.push('a-start');
      await first.promise;
      order.push('a-end');
    });
    const taskB = mutex.runExclusive('auction-2', () => {
      order.push('b-start');
      order.push('b-end');
      return Promise.resolve();
    });

    await taskB;
    // Task B (a different key) completed while task A was still awaiting.
    expect(order).toEqual(['a-start', 'b-start', 'b-end']);

    first.resolve();
    await taskA;
    expect(order).toEqual(['a-start', 'b-start', 'b-end', 'a-end']);
  });

  it('propagates a rejection without wedging later tasks on the same key', async () => {
    const mutex = createKeyedMutex();

    await expect(
      mutex.runExclusive('auction-1', () => Promise.reject(new Error('boom'))),
    ).rejects.toThrow('boom');

    const result = await mutex.runExclusive('auction-1', () => Promise.resolve('ok'));
    expect(result).toBe('ok');
  });

  it('resolves with the task result', async () => {
    const mutex = createKeyedMutex();
    const result = await mutex.runExclusive('auction-1', () => Promise.resolve(42));
    expect(result).toBe(42);
  });
});
