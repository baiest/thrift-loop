export interface SkeletonProps {
  readonly className?: string;
  readonly 'data-testid'?: string;
}

export function Skeleton({
  className = '',
  'data-testid': testId,
}: SkeletonProps): React.JSX.Element {
  return (
    <div
      aria-hidden="true"
      data-testid={testId}
      className={`animate-pulse rounded-md bg-linen ${className}`}
    />
  );
}
