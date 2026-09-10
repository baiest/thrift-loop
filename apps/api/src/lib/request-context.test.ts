import { describe, expect, it } from 'vitest';
import { getIp, getRequestId, runWithRequestId } from './request-context.js';

describe('request-context', () => {
  it('returns undefined outside any runWithRequestId call', () => {
    expect(getRequestId()).toBeUndefined();
  });

  it('makes the id readable inside the callback', () => {
    runWithRequestId('REQ-1', () => {
      expect(getRequestId()).toBe('REQ-1');
    });
  });

  it('keeps the id readable across an await', async () => {
    await runWithRequestId('REQ-2', async () => {
      await Promise.resolve();
      expect(getRequestId()).toBe('REQ-2');
    });
  });

  it('does not leak the id into sibling calls', async () => {
    const results: (string | undefined)[] = [];
    await Promise.all([
      runWithRequestId('REQ-A', async () => {
        await Promise.resolve();
        results.push(getRequestId());
      }),
      runWithRequestId('REQ-B', async () => {
        await Promise.resolve();
        results.push(getRequestId());
      }),
    ]);
    expect(results.toSorted((a, b) => (a ?? '').localeCompare(b ?? ''))).toEqual([
      'REQ-A',
      'REQ-B',
    ]);
  });

  it('does not leak the id outside the callback once it returns', () => {
    runWithRequestId('REQ-3', () => {});
    expect(getRequestId()).toBeUndefined();
  });

  it('returns undefined for the ip outside any call, and when none was given', () => {
    expect(getIp()).toBeUndefined();
    runWithRequestId('REQ-4', () => {
      expect(getIp()).toBeUndefined();
    });
  });

  it('makes an ip passed to runWithRequestId readable inside the callback', () => {
    runWithRequestId(
      'REQ-5',
      () => {
        expect(getIp()).toBe('127.0.0.1');
      },
      '127.0.0.1',
    );
  });
});
