import { NavLink } from 'react-router-dom';
import { Icon, type IconName } from '../atoms/icon.js';
import { UnreadBadge } from '../atoms/unread-badge.js';
import { useAuthStore } from '../../stores/auth-store.js';
import { useLogout } from '../../hooks/use-logout.js';
import { useRealtimeStore } from '../../stores/realtime-store.js';
import { NotificationBell } from './notification-bell.js';

interface NavItem {
  readonly label: string;
  readonly to: string;
  readonly icon: IconName;
  readonly end: boolean;
}

const NAV_ITEMS: readonly NavItem[] = [
  { label: 'Auctions', to: '/', icon: 'compass', end: true },
  { label: 'My auctions', to: '/auctions/mine', icon: 'tag', end: false },
  { label: 'My purchases', to: '/purchases', icon: 'grip', end: false },
  { label: 'My bids', to: '/my-bids', icon: 'gavel', end: false },
  { label: 'My profile', to: '/profile', icon: 'user', end: false },
];

// Shorter labels than the desktop nav's, purely so seven tabs (including the
// notification bell below) fit a narrow phone screen without horizontal
// scrolling — same destinations, same icons for context.
const MOBILE_TAB_ITEMS: readonly NavItem[] = [
  { label: 'Auctions', to: '/', icon: 'compass', end: true },
  { label: 'Selling', to: '/auctions/mine', icon: 'tag', end: false },
  { label: 'Bids', to: '/my-bids', icon: 'gavel', end: false },
  { label: 'Bought', to: '/purchases', icon: 'grip', end: false },
  { label: 'Create', to: '/auctions/new', icon: 'plus-circle', end: false },
  { label: 'Profile', to: '/profile', icon: 'user', end: false },
];

const LINK_BASE_CLASSES = 'flex items-center gap-3 rounded-lg px-3 py-2 font-medium';
const LINK_INACTIVE_CLASSES = 'text-ink-soft hover:bg-brand-50';
const LINK_ACTIVE_CLASSES = 'border-l-4 border-brand-500 bg-brand-100 text-brand-700';

function initials(firstName: string, lastName: string): string {
  return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
}

function BrandBlock({ withSubtitle }: { readonly withSubtitle: boolean }): React.JSX.Element {
  return (
    <div className="mb-6">
      <p className="font-display text-xl font-bold text-ink">Thrift Loop</p>
      {withSubtitle && <p className="text-xs font-medium text-ink-soft">Secondhand Fashion</p>}
    </div>
  );
}

function DesktopUserBlock(): React.JSX.Element | null {
  const user = useAuthStore((state) => state.user);
  const logout = useLogout();

  if (!user) {
    return null;
  }

  return (
    <div className="mt-auto border-t border-hairline pt-4">
      <div className="mb-2 flex items-center gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-linen text-sm font-semibold text-ink">
          {initials(user.firstName, user.lastName)}
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-ink">{`${user.firstName} ${user.lastName}`}</p>
          <p className="text-xs text-ink-soft">{user.city}</p>
        </div>
        <NotificationBell />
      </div>
      <button
        type="button"
        onClick={() => void logout()}
        className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left font-medium text-ink-soft hover:bg-brand-50"
      >
        <Icon name="log-out" className="h-5 w-5" />
        Log out
      </button>
    </div>
  );
}

function TabletLogoutButton(): React.JSX.Element | null {
  const user = useAuthStore((state) => state.user);
  const logout = useLogout();

  if (!user) {
    return null;
  }

  return (
    <button
      type="button"
      aria-label="Log out"
      onClick={() => void logout()}
      className="mt-auto flex h-11 w-11 items-center justify-center rounded-lg text-ink-soft hover:bg-brand-50"
    >
      <Icon name="log-out" className="h-5 w-5" />
    </button>
  );
}

function DesktopSidebar(): React.JSX.Element {
  return (
    <nav
      aria-label="Main navigation"
      className="fixed inset-y-0 left-0 z-10 hidden w-64 flex-col bg-white p-6 shadow-none lg:flex"
    >
      <BrandBlock withSubtitle />
      <ul className="space-y-2">
        {NAV_ITEMS.map((item) => (
          <li key={item.to}>
            <NavLink
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `${LINK_BASE_CLASSES} ${isActive ? LINK_ACTIVE_CLASSES : LINK_INACTIVE_CLASSES}`
              }
            >
              <Icon name={item.icon} className="h-5 w-5" />
              {item.label}
            </NavLink>
          </li>
        ))}
      </ul>
      <DesktopUserBlock />
    </nav>
  );
}

function TabletRail(): React.JSX.Element {
  return (
    <nav
      aria-label="Tablet navigation"
      className="fixed inset-y-0 left-0 z-10 hidden w-[72px] flex-col items-center gap-2 bg-white py-6 md:flex lg:hidden"
    >
      <BrandBlock withSubtitle={false} />
      {NAV_ITEMS.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          end={item.end}
          aria-label={item.label}
          title={item.label}
          className={({ isActive }) =>
            `flex h-11 w-11 items-center justify-center rounded-lg ${
              isActive ? 'bg-brand-100 text-brand-700' : 'text-ink-soft hover:bg-brand-50'
            }`
          }
        >
          <Icon name={item.icon} className="h-5 w-5" />
        </NavLink>
      ))}
      <NotificationBell />
      <TabletLogoutButton />
    </nav>
  );
}

function MobileNotificationsTab(): React.JSX.Element | null {
  const user = useAuthStore((state) => state.user);
  const unreadCount = useRealtimeStore((state) => state.unreadCount);

  if (!user) {
    return null;
  }

  return (
    <NavLink
      to="/notifications"
      className={({ isActive }) =>
        `relative flex shrink-0 flex-col items-center gap-0.5 px-1 py-1 text-xs font-medium ${
          isActive ? 'text-brand-600' : 'text-ink-soft'
        }`
      }
    >
      <span className="relative">
        <Icon name="bell" className="h-5 w-5" />
        <UnreadBadge count={unreadCount} />
      </span>
      Alerts
    </NavLink>
  );
}

function MobileTabBar(): React.JSX.Element {
  return (
    <nav
      aria-label="Mobile navigation"
      className="fixed inset-x-0 bottom-0 z-10 flex items-center justify-around overflow-x-auto border-t border-hairline bg-white py-2 md:hidden"
    >
      {MOBILE_TAB_ITEMS.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          end={item.end}
          className={({ isActive }) =>
            `flex shrink-0 flex-col items-center gap-0.5 px-1 py-1 text-xs font-medium ${
              isActive ? 'text-brand-600' : 'text-ink-soft'
            }`
          }
        >
          <Icon name={item.icon} className="h-5 w-5" />
          {item.label}
        </NavLink>
      ))}
      <MobileNotificationsTab />
    </nav>
  );
}

export function SidebarNav(): React.JSX.Element {
  return (
    <>
      <DesktopSidebar />
      <TabletRail />
      <MobileTabBar />
    </>
  );
}
