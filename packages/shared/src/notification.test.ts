import { describe, expect, it } from 'vitest';
import {
  DEFAULT_NOTIFICATION_PREFERENCES,
  isNotificationType,
  NOTIFICATION_TYPES,
} from './notification.js';

describe('NOTIFICATION_TYPES', () => {
  it('lists the three notification types', () => {
    expect(NOTIFICATION_TYPES).toEqual(['outbid', 'auction-won', 'bid-on-my-listing']);
  });
});

describe('isNotificationType', () => {
  it('accepts every known type', () => {
    for (const type of NOTIFICATION_TYPES) {
      expect(isNotificationType(type)).toBe(true);
    }
  });

  it('rejects an unknown value', () => {
    expect(isNotificationType('sold')).toBe(false);
    expect(isNotificationType('')).toBe(false);
  });
});

describe('DEFAULT_NOTIFICATION_PREFERENCES', () => {
  it('defaults every preference to on', () => {
    expect(DEFAULT_NOTIFICATION_PREFERENCES).toEqual({
      outbid: true,
      auctionWon: true,
      bidOnMyListing: true,
    });
  });
});
