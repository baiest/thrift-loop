import { Link } from 'react-router-dom';
import type { PublicNotification } from '@thrift-loop/shared';
import { formatCOP } from '../../lib/format.js';

export interface NotificationItemProps {
  readonly notification: PublicNotification;
}

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

export function NotificationItem({ notification }: NotificationItemProps): React.JSX.Element {
  const isUnread = notification.readAt === null;

  return (
    <Link
      to={`/auctions/${notification.auctionId}`}
      className={`block rounded-lg p-3 text-sm hover:bg-surface-alt ${
        isUnread ? 'bg-brand-50' : ''
      }`}
    >
      {describeNotification(notification)}
    </Link>
  );
}
