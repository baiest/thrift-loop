import { describe, expect, it, vi } from 'vitest';
import { createEventBus, type DomainEvent } from './event-bus.js';
import { NOOP_LOGGER, type Logger } from './logger.js';

interface RecordedLogCall {
  level: string;
  event: string;
  fields: Record<string, unknown>;
}

function createFakeLogger(): { logger: Logger; calls: RecordedLogCall[] } {
  const calls: RecordedLogCall[] = [];
  const record =
    (level: string) =>
    (event: string, fields: Record<string, unknown> = {}) => {
      calls.push({ level, event, fields });
    };
  return {
    calls,
    logger: {
      info: record('info'),
      warning: record('warning'),
      error: record('error'),
      critical: record('critical'),
      time: async (_event, _fields, fn) => fn(),
      close: async () => {},
    },
  };
}

const sampleEvent: DomainEvent = {
  type: 'bid-placed',
  auctionId: 'AUC-1',
  auctionTitle: 'Chaqueta de cuero',
  ownerUserId: 'USR-owner',
  bidderId: 'USR-bidder',
  bidderFirstName: 'Ana',
  amountCOP: 60_000,
  bidCount: 2,
  bidEndsAt: null,
  previousTopBidderId: null,
  occurredAt: '2026-01-01T00:00:00.000Z',
};

describe('createEventBus', () => {
  it('delivers a published event to a subscribed listener', () => {
    const bus = createEventBus(NOOP_LOGGER);
    const listener = vi.fn();
    bus.subscribe(listener);

    bus.publish(sampleEvent);

    expect(listener).toHaveBeenCalledWith(sampleEvent);
  });

  it('delivers to every subscribed listener', () => {
    const bus = createEventBus(NOOP_LOGGER);
    const first = vi.fn();
    const second = vi.fn();
    bus.subscribe(first);
    bus.subscribe(second);

    bus.publish(sampleEvent);

    expect(first).toHaveBeenCalledWith(sampleEvent);
    expect(second).toHaveBeenCalledWith(sampleEvent);
  });

  it('stops delivering once unsubscribed', () => {
    const bus = createEventBus(NOOP_LOGGER);
    const listener = vi.fn();
    const unsubscribe = bus.subscribe(listener);

    unsubscribe();
    bus.publish(sampleEvent);

    expect(listener).not.toHaveBeenCalled();
  });

  it('does not let a throwing listener block the next listener', () => {
    const bus = createEventBus(NOOP_LOGGER);
    const throwing = vi.fn(() => {
      throw new Error('boom');
    });
    const next = vi.fn();
    bus.subscribe(throwing);
    bus.subscribe(next);

    bus.publish(sampleEvent);

    expect(next).toHaveBeenCalledWith(sampleEvent);
  });

  it('does not let a throwing listener escape publish', () => {
    const bus = createEventBus(NOOP_LOGGER);
    bus.subscribe(() => {
      throw new Error('boom');
    });

    expect(() => bus.publish(sampleEvent)).not.toThrow();
  });

  it('logs event_listener_failed when a listener throws', () => {
    const { logger, calls } = createFakeLogger();
    const bus = createEventBus(logger);
    bus.subscribe(() => {
      throw new Error('boom');
    });

    bus.publish(sampleEvent);

    expect(calls).toContainEqual({
      level: 'error',
      event: 'event_listener_failed',
      fields: expect.objectContaining({ message: 'boom' }) as Record<string, unknown>,
    });
  });
});
