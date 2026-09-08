import { describe, expect, it } from 'vitest';
import { ALLOWED_PHOTO_MIME_TYPES, isAllowedPhotoMimeType } from './photo.js';

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
