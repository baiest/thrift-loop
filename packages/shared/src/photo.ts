const BYTES_PER_KILOBYTE = 1024;
const KILOBYTES_PER_MEGABYTE = 1024;
const MAX_PHOTO_SIZE_MB = 5;

export const MAX_PHOTOS_PER_AUCTION = 10;
export const MAX_PHOTO_SIZE_BYTES = MAX_PHOTO_SIZE_MB * KILOBYTES_PER_MEGABYTE * BYTES_PER_KILOBYTE;
export const ALLOWED_PHOTO_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const;

export type AllowedPhotoMimeType = (typeof ALLOWED_PHOTO_MIME_TYPES)[number];

const ALLOWED_PHOTO_MIME_TYPE_SET = new Set<string>(ALLOWED_PHOTO_MIME_TYPES);

export function isAllowedPhotoMimeType(value: string): value is AllowedPhotoMimeType {
  return ALLOWED_PHOTO_MIME_TYPE_SET.has(value);
}
