const MAX_BADGE_COUNT = 9;

export interface UnreadBadgeProps {
  readonly count: number;
}

/** Small count pill anchored to the top-right corner of whatever icon it's
 * placed inside (parent needs `relative`). Shared by the desktop/tablet bell
 * and the mobile "Alerts" tab so the two never drift out of sync again. */
export function UnreadBadge({ count }: UnreadBadgeProps): React.JSX.Element | null {
  if (count <= 0) {
    return null;
  }
  return (
    <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-brand-600 px-1 text-[10px] font-semibold text-white">
      {count > MAX_BADGE_COUNT ? '9+' : count}
    </span>
  );
}
