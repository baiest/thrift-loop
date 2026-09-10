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

const PHOTO_MIME_TYPE_EXTENSIONS: Record<AllowedPhotoMimeType, string> = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
};

/** Storage extension for a validated content-type. Must never be derived
 * from client input (e.g. a filename): static file servers key the served
 * Content-Type off the extension, so an attacker-chosen extension could
 * serve arbitrary bytes as SVG/HTML — stored XSS. */
export function extensionForPhotoMimeType(mimeType: AllowedPhotoMimeType): string {
  // mimeType is narrowed to the fixed AllowedPhotoMimeType union above.
  // eslint-disable-next-line security/detect-object-injection
  return PHOTO_MIME_TYPE_EXTENSIONS[mimeType];
}
