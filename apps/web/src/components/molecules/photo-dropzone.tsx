import { useEffect, useState, type ChangeEvent, type DragEvent } from 'react';
import {
  ALLOWED_PHOTO_MIME_TYPES,
  isAllowedPhotoMimeType,
  MAX_PHOTOS_PER_AUCTION,
  MAX_PHOTO_SIZE_BYTES,
} from '@thrift-loop/shared';
import { FieldError } from '../atoms/field-error.js';
import { Icon } from '../atoms/icon.js';

const INVALID_FILE_MESSAGE = `Only ${ALLOWED_PHOTO_MIME_TYPES.join(', ')} up to 5MB are allowed`;
const ACCEPTED_MIME_TYPES = ALLOWED_PHOTO_MIME_TYPES.join(',');

export interface PhotoDropzoneProps {
  readonly files: File[];
  readonly onChange: (files: File[]) => void;
}

function isValidPhoto(file: File): boolean {
  return isAllowedPhotoMimeType(file.type) && file.size <= MAX_PHOTO_SIZE_BYTES;
}

// Indices here are always caller-supplied array positions, not request data.
/* eslint-disable security/detect-object-injection */
function swap<T>(list: readonly T[], indexA: number, indexB: number): T[] {
  const next = [...list];
  const itemA = next[indexA];
  const itemB = next[indexB];
  if (itemA === undefined || itemB === undefined) {
    return next;
  }
  next[indexA] = itemB;
  next[indexB] = itemA;
  return next;
}
/* eslint-enable security/detect-object-injection */

export function PhotoDropzone({ files, onChange }: PhotoDropzoneProps): React.JSX.Element {
  const [error, setError] = useState<string | undefined>(undefined);
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);

  useEffect(() => {
    const urls = files.map((file) => URL.createObjectURL(file));
    setPreviewUrls(urls);
    return () => {
      urls.forEach((url) => URL.revokeObjectURL(url));
    };
  }, [files]);

  function addFiles(selected: File[]): void {
    const validSelected = selected.filter(isValidPhoto);
    setError(validSelected.length === selected.length ? undefined : INVALID_FILE_MESSAGE);
    if (validSelected.length > 0) {
      onChange([...files, ...validSelected].slice(0, MAX_PHOTOS_PER_AUCTION));
    }
  }

  function handleFileInput(event: ChangeEvent<HTMLInputElement>): void {
    addFiles(Array.from(event.target.files ?? []));
    event.target.value = '';
  }

  function handleDrop(event: DragEvent<HTMLDivElement>): void {
    event.preventDefault();
    addFiles(Array.from(event.dataTransfer.files ?? []));
  }

  function removePhoto(index: number): void {
    onChange(files.filter((_file, fileIndex) => fileIndex !== index));
  }

  function moveLater(index: number): void {
    if (index >= files.length - 1) {
      return;
    }
    onChange(swap(files, index, index + 1));
  }

  const atMax = files.length >= MAX_PHOTOS_PER_AUCTION;

  return (
    <div>
      <div
        data-testid="photo-dropzone"
        onDragOver={(event) => event.preventDefault()}
        onDrop={handleDrop}
        className="flex flex-col items-center gap-2 rounded-xl border-2 border-dashed border-linen bg-white p-8 text-center"
      >
        <Icon name="upload" className="h-8 w-8 text-brand-500" />
        <label htmlFor="auction-photos" className="cursor-pointer font-medium text-ink">
          Drag and drop your photos here, or{' '}
          <span className="text-brand-600 underline">browse files</span>
        </label>
        <input
          id="auction-photos"
          aria-label="Add photos"
          type="file"
          accept={ACCEPTED_MIME_TYPES}
          multiple
          disabled={atMax}
          onChange={handleFileInput}
          className="sr-only"
        />
        <p className="text-xs text-ink-soft">JPG or PNG, up to 5 MB each, 10 photos max</p>
      </div>
      <p className="mt-1 text-xs text-ink-soft">
        {files.length}/{MAX_PHOTOS_PER_AUCTION} photos
      </p>
      <FieldError message={error} />
      {previewUrls.length > 0 && (
        <div className="mt-2 grid grid-cols-3 gap-2">
          {previewUrls.map((url, index) => (
            <div key={url} className="relative">
              <img src={url} alt="" className="aspect-square w-full rounded-lg object-cover" />
              {index === 0 && (
                <span className="absolute left-1 top-1 rounded-full bg-brand-500 px-2 py-0.5 text-xs font-medium text-white">
                  Cover
                </span>
              )}
              <button
                type="button"
                onClick={() => removePhoto(index)}
                aria-label={`Remove photo ${index + 1}`}
                className="absolute right-1 top-1 rounded-full bg-white/90 px-2 text-xs font-semibold text-red-600 shadow"
              >
                Remove
              </button>
              {index < files.length - 1 && (
                <button
                  type="button"
                  onClick={() => moveLater(index)}
                  // index is this map's own iteration index into `files`, not request data.
                  // eslint-disable-next-line security/detect-object-injection
                  aria-label={`Move ${files[index]?.name} later`}
                  className="absolute bottom-1 right-1 rounded-full bg-white/90 p-1 shadow"
                >
                  <Icon name="grip" className="h-3 w-3" />
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
