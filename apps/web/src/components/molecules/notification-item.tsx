import { Link } from 'react-router-dom';
import type { NotificationType, PublicNotification } from '@thrift-loop/shared';
import { formatCOP, formatRelativeTime } from '../../lib/format.js';
import { useNow } from '../../hooks/use-now.js';
import { Icon, type IconName } from '../atoms/icon.js';

export interface NotificationItemProps {
  readonly notification: PublicNotification;
  /** Called with the notification's id when an unread notification is
   * clicked. The parent owns the actual markNotificationRead call and the
   * shared unread-count update — this component only reports the intent. */
  readonly onRead?: (id: string) => void;
  /** Overridable for tests; defaults to a live, minute-ticking clock. */
  readonly now?: Date;
}

const TYPE_BADGE: Record<NotificationType, { icon: IconName; bg: string; fg: string }> = {
  'bid-on-my-listing': { icon: 'gavel', bg: 'bg-brand-100', fg: 'text-brand-600' },
  outbid: {
    icon: 'alert-circle',
    bg: 'bg-[var(--color-amber-tint)]',
    fg: 'text-[var(--color-amber-ink)]',
  },
  'auction-won': {
    icon: 'check-circle',
    bg: 'bg-[var(--color-sage-tint)]',
    fg: 'text-[var(--color-sage-ink)]',
  },
};

function describeNotification(notification: PublicNotification): string {
  const amount = notification.amountCOP !== null ? formatCOP(notification.amountCOP) : '';
  switch (notification.type) {
    case 'outbid':
      return `You were outbid on "${notification.auctionTitle}" — now ${amount}`;
    case 'auction-won':
      return `You won "${notification.auctionTitle}" for ${amount}`;
    case 'bid-on-my-listing':
      return `${notification.actorFirstName ?? 'Someone'} bid ${amount} on "${notification.auctionTitle}"`;
    default:
      return notification.auctionTitle;
  }
}

export function NotificationItem({
  notification,
  onRead,
  now,
}: NotificationItemProps): React.JSX.Element {
  const liveNow = useNow();
  const isUnread = notification.readAt === null;
  const badge = TYPE_BADGE[notification.type];

  return (
    <Link
      to={`/auctions/${notification.auctionId}`}
      onClick={() => {
        if (isUnread) {
          onRead?.(notification.id);
        }
      }}
      className={`flex items-start gap-3 rounded-lg p-3 text-sm hover:bg-surface-alt ${
        isUnread ? 'bg-brand-50' : ''
      }`}
    >
      <span
        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${badge.bg} ${badge.fg}`}
      >
        <Icon name={badge.icon} className="h-5 w-5" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-ink">{describeNotification(notification)}</span>
        <span className="mt-0.5 block text-xs text-ink-faint">
          {formatRelativeTime(notification.createdAt, now ?? liveNow)}
        </span>
      </span>
      {isUnread && (
        <span aria-hidden="true" className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-brand-500" />
      )}
    </Link>
  );
}
