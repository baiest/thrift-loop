import { describe, expect, it } from 'vitest';
import {
  ALLOWED_PHOTO_MIME_TYPES,
  extensionForPhotoMimeType,
  isAllowedPhotoMimeType,
} from './photo.js';

describe('isAllowedPhotoMimeType', () => {
  it('accepts every allowed mime type', () => {
    for (const mimeType of ALLOWED_PHOTO_MIME_TYPES) {
      expect(isAllowedPhotoMimeType(mimeType)).toBe(true);
    }
  });

  it('rejects a disallowed mime type', () => {
    expect(isAllowedPhotoMimeType('image/gif')).toBe(false);
  });

  it('rejects a non-image mime type', () => {
    expect(isAllowedPhotoMimeType('application/pdf')).toBe(false);
  });
});

describe('extensionForPhotoMimeType', () => {
  it('maps every allowed mime type to a distinct, safe image extension', () => {
    const extensions = ALLOWED_PHOTO_MIME_TYPES.map(extensionForPhotoMimeType);
    expect(extensions).toEqual(['.jpg', '.png', '.webp']);
    expect(new Set(extensions).size).toBe(ALLOWED_PHOTO_MIME_TYPES.length);
  });
});
