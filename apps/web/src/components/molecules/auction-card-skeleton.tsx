import { Skeleton } from '../atoms/skeleton.js';

export function AuctionCardSkeleton(): React.JSX.Element {
  return (
    <div aria-label="Loading auction" className="overflow-hidden rounded-lg border border-hairline">
      <Skeleton className="aspect-[4/5] w-full rounded-none" />
      <div className="space-y-2 p-3">
        <div className="flex gap-2">
          <Skeleton className="h-4 w-16 rounded-full" />
          <Skeleton className="h-4 w-12 rounded-full" />
        </div>
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-6 w-1/2" />
        <Skeleton className="h-3 w-1/3" />
      </div>
    </div>
  );
}
