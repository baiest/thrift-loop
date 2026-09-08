import { useEffect, useState, type ChangeEvent } from 'react';
import {
  ALLOWED_PHOTO_MIME_TYPES,
  isAllowedPhotoMimeType,
  MAX_PHOTOS_PER_AUCTION,
  MAX_PHOTO_SIZE_BYTES,
} from '@thrift-loop/shared';
import { FieldError } from '../atoms/field-error.js';

const INVALID_FILE_MESSAGE = `Only ${ALLOWED_PHOTO_MIME_TYPES.join(', ')} up to 5MB are allowed`;
const ACCEPTED_MIME_TYPES = ALLOWED_PHOTO_MIME_TYPES.join(',');

export interface PhotoUploaderProps {
  readonly files: File[];
  readonly onChange: (files: File[]) => void;
}

function isValidPhoto(file: File): boolean {
  return isAllowedPhotoMimeType(file.type) && file.size <= MAX_PHOTO_SIZE_BYTES;
}

export function PhotoUploader({ files, onChange }: PhotoUploaderProps): React.JSX.Element {
  const [error, setError] = useState<string | undefined>(undefined);
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);

  useEffect(() => {
    const urls = files.map((file) => URL.createObjectURL(file));
    setPreviewUrls(urls);
    return () => {
      urls.forEach((url) => URL.revokeObjectURL(url));
    };
  }, [files]);

  function handleFileInput(event: ChangeEvent<HTMLInputElement>): void {
    const selected = Array.from(event.target.files ?? []);
    const validSelected = selected.filter(isValidPhoto);

    setError(validSelected.length === selected.length ? undefined : INVALID_FILE_MESSAGE);
    if (validSelected.length > 0) {
      onChange([...files, ...validSelected].slice(0, MAX_PHOTOS_PER_AUCTION));
    }
    event.target.value = '';
  }

  function removePhoto(index: number): void {
    onChange(files.filter((_file, fileIndex) => fileIndex !== index));
  }

  const atMax = files.length >= MAX_PHOTOS_PER_AUCTION;

  return (
    <div>
      <label htmlFor="auction-photos" className="mb-1 block text-sm font-medium text-gray-700">
        Add photos
      </label>
      <input
        id="auction-photos"
        type="file"
        accept={ACCEPTED_MIME_TYPES}
        multiple
        disabled={atMax}
        onChange={handleFileInput}
        className="block w-full text-sm"
      />
      <p className="mt-1 text-xs text-gray-500">
        {files.length}/{MAX_PHOTOS_PER_AUCTION} photos
      </p>
      <FieldError message={error} />
      {previewUrls.length > 0 && (
        <div className="mt-2 grid grid-cols-3 gap-2">
          {previewUrls.map((url, index) => (
            <div key={url} className="relative">
              <img src={url} alt="" className="aspect-square w-full rounded-lg object-cover" />
              <button
                type="button"
                onClick={() => removePhoto(index)}
                aria-label={`Remove photo ${index + 1}`}
                className="absolute right-1 top-1 rounded-full bg-white/90 px-2 text-xs font-semibold text-red-600 shadow"
              >
                Remove
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
