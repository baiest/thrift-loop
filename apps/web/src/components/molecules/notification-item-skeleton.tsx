import { Skeleton } from '../atoms/skeleton.js';

export function NotificationItemSkeleton(): React.JSX.Element {
  return (
    <div aria-label="Loading notification" className="flex items-start gap-3 rounded-lg p-3">
      <Skeleton className="h-9 w-9 shrink-0 rounded-full" />
      <div className="min-w-0 flex-1 space-y-2">
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-3 w-1/4" />
      </div>
    </div>
  );
}
