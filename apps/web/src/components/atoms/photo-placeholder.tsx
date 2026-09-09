export interface PhotoPlaceholderProps {
  readonly className?: string;
}

export function PhotoPlaceholder({
  className = 'aspect-[4/5]',
}: PhotoPlaceholderProps): React.JSX.Element {
  return (
    <div
      aria-label="No photo"
      className={`flex items-center justify-center rounded-lg bg-linen ${className}`}
    >
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={2}
        className="h-8 w-8 text-ink-faint"
      >
        <rect x="3" y="5" width="18" height="14" rx="2" />
        <circle cx="12" cy="12" r="3" />
      </svg>
    </div>
  );
}
