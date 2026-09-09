import { afterEach, beforeEach, describe, expect, it, vi, type MockInstance } from 'vitest';
import { createEventBus, type DomainEvent } from './event-bus.js';

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
  let consoleErrorSpy: MockInstance<(...args: unknown[]) => void>;

  beforeEach(() => {
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  it('delivers a published event to a subscribed listener', () => {
    const bus = createEventBus();
    const listener = vi.fn();
    bus.subscribe(listener);

    bus.publish(sampleEvent);

    expect(listener).toHaveBeenCalledWith(sampleEvent);
  });

  it('delivers to every subscribed listener', () => {
    const bus = createEventBus();
    const first = vi.fn();
    const second = vi.fn();
    bus.subscribe(first);
    bus.subscribe(second);

    bus.publish(sampleEvent);

    expect(first).toHaveBeenCalledWith(sampleEvent);
    expect(second).toHaveBeenCalledWith(sampleEvent);
  });

  it('stops delivering once unsubscribed', () => {
    const bus = createEventBus();
    const listener = vi.fn();
    const unsubscribe = bus.subscribe(listener);

    unsubscribe();
    bus.publish(sampleEvent);

    expect(listener).not.toHaveBeenCalled();
  });

  it('does not let a throwing listener block the next listener', () => {
    const bus = createEventBus();
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
    const bus = createEventBus();
    bus.subscribe(() => {
      throw new Error('boom');
    });

    expect(() => bus.publish(sampleEvent)).not.toThrow();
  });
});
