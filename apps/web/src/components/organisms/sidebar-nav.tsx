import { useState } from 'react';
import { Link } from 'react-router-dom';

interface NavItem {
  readonly label: string;
  readonly to: string;
}

const NAV_ITEMS: readonly NavItem[] = [{ label: 'Create auction', to: '/auctions/new' }];

export function SidebarNav(): React.JSX.Element {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        aria-label="Menu"
        onClick={() => setIsOpen((current) => !current)}
        className="fixed left-4 top-4 z-20 rounded-lg bg-white p-2 shadow"
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          className="h-6 w-6"
        >
          <path d="M4 6h16M4 12h16M4 18h16" strokeLinecap="round" />
        </svg>
      </button>

      {isOpen && (
        <button
          type="button"
          aria-label="Close menu"
          onClick={() => setIsOpen(false)}
          className="fixed inset-0 z-10 bg-black/30"
        />
      )}

      <nav
        style={{ visibility: isOpen ? 'visible' : 'hidden' }}
        className={`fixed inset-y-0 left-0 z-10 w-64 bg-white p-6 pt-16 shadow-lg transition-transform ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <ul className="space-y-2">
          {NAV_ITEMS.map((item) => (
            <li key={item.to}>
              <Link
                to={item.to}
                onClick={() => setIsOpen(false)}
                className="block rounded-lg px-3 py-2 font-medium text-gray-700 hover:bg-emerald-50"
              >
                {item.label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </>
  );
}
