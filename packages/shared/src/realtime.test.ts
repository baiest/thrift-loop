import { describe, expect, it } from 'vitest';
import { parseClientMessage, REALTIME_PATH } from './realtime.js';

describe('REALTIME_PATH', () => {
  it('is an /api path so a stray plain GET 404s instead of hitting the SPA fallback', () => {
    expect(REALTIME_PATH).toBe('/api/realtime');
  });
});

describe('parseClientMessage', () => {
  it('parses a subscribe-auction message', () => {
    const raw = JSON.stringify({ type: 'subscribe-auction', auctionId: 'AUC-1' });
    expect(parseClientMessage(raw)).toEqual({ type: 'subscribe-auction', auctionId: 'AUC-1' });
  });

  it('parses an unsubscribe-auction message', () => {
    const raw = JSON.stringify({ type: 'unsubscribe-auction', auctionId: 'AUC-1' });
    expect(parseClientMessage(raw)).toEqual({ type: 'unsubscribe-auction', auctionId: 'AUC-1' });
  });

  it('parses subscribe-grid, unsubscribe-grid, and ping with no extra fields', () => {
    expect(parseClientMessage(JSON.stringify({ type: 'subscribe-grid' }))).toEqual({
      type: 'subscribe-grid',
    });
    expect(parseClientMessage(JSON.stringify({ type: 'unsubscribe-grid' }))).toEqual({
      type: 'unsubscribe-grid',
    });
    expect(parseClientMessage(JSON.stringify({ type: 'ping' }))).toEqual({ type: 'ping' });
  });

  it('returns null for invalid JSON', () => {
    expect(parseClientMessage('not json')).toBeNull();
  });

  it('returns null for a non-object payload', () => {
    expect(parseClientMessage(JSON.stringify('a string'))).toBeNull();
    expect(parseClientMessage(JSON.stringify(42))).toBeNull();
    expect(parseClientMessage(JSON.stringify(null))).toBeNull();
  });

  it('returns null for an unknown type', () => {
    expect(parseClientMessage(JSON.stringify({ type: 'delete-everything' }))).toBeNull();
  });

  it('returns null when a subscribe-auction message is missing auctionId', () => {
    expect(parseClientMessage(JSON.stringify({ type: 'subscribe-auction' }))).toBeNull();
  });

  it('returns null when auctionId is not a string', () => {
    expect(
      parseClientMessage(JSON.stringify({ type: 'subscribe-auction', auctionId: 123 })),
    ).toBeNull();
  });

  it('returns null when auctionId is an empty string', () => {
    expect(
      parseClientMessage(JSON.stringify({ type: 'subscribe-auction', auctionId: '' })),
    ).toBeNull();
  });

  it('returns null when auctionId is unreasonably long', () => {
    const auctionId = 'A'.repeat(500);
    expect(parseClientMessage(JSON.stringify({ type: 'subscribe-auction', auctionId }))).toBeNull();
  });

  it('returns null for a prototype-pollution-shaped payload', () => {
    expect(parseClientMessage(JSON.stringify({ type: '__proto__' }))).toBeNull();
    expect(
      parseClientMessage('{"type":"subscribe-auction","auctionId":"AUC-1","__proto__":{"x":1}}'),
    ).toEqual({ type: 'subscribe-auction', auctionId: 'AUC-1' });
  });
});
