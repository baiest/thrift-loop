import { afterEach, describe, expect, it } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import type { PublicUser } from '@thrift-loop/shared';
import { SidebarNav } from './sidebar-nav.js';
import { useAuthStore } from '../../stores/auth-store.js';

const SAMPLE_USER: PublicUser = {
  id: 'USR-1',
  firstName: 'Juan',
  lastName: 'Ballesteros',
  city: 'Bogotá D.C.',
  country: 'CO',
  address: null,
  categoryPreference: null,
};

function renderNav(initialEntries: string[] = ['/']): void {
  render(
    <MemoryRouter initialEntries={initialEntries}>
      <SidebarNav />
    </MemoryRouter>,
  );
}

describe('SidebarNav', () => {
  afterEach(() => {
    useAuthStore.getState().clearUser();
  });

  it('renders no hamburger menu button at any breakpoint', () => {
    renderNav();
    expect(screen.queryByRole('button', { name: /menu/i })).not.toBeInTheDocument();
  });

  describe('desktop navigation (lg+)', () => {
    function desktopNav(): HTMLElement {
      return screen.getByRole('navigation', { name: 'Main navigation' });
    }

    it('shows the brand name and subtitle above the nav items', () => {
      renderNav();
      const nav = desktopNav();
      expect(within(nav).getByText('Thrift Loop')).toBeInTheDocument();
      expect(within(nav).getByText('Secondhand Fashion')).toBeInTheDocument();
    });

    it('does not duplicate Create auction (it lives in the page header CTA)', () => {
      renderNav();
      expect(
        within(desktopNav()).queryByRole('link', { name: /create auction/i }),
      ).not.toBeInTheDocument();
    });

    it('has Auctions as the first nav link, linking to /', () => {
      renderNav();
      const links = within(desktopNav()).getAllByRole('link');
      expect(links[0]).toHaveTextContent(/^auctions$/i);
      expect(links[0]).toHaveAttribute('href', '/');
    });

    it('links to auctions, purchases, and profile', () => {
      renderNav();
      const nav = desktopNav();
      expect(within(nav).getByRole('link', { name: /^auctions$/i })).toHaveAttribute('href', '/');
      expect(within(nav).getByRole('link', { name: /my auctions/i })).toHaveAttribute(
        'href',
        '/auctions/mine',
      );
      expect(within(nav).getByRole('link', { name: /my purchases/i })).toHaveAttribute(
        'href',
        '/purchases',
      );
      expect(within(nav).getByRole('link', { name: /my bids/i })).toHaveAttribute(
        'href',
        '/my-bids',
      );
      expect(within(nav).getByRole('link', { name: /my profile/i })).toHaveAttribute(
        'href',
        '/profile',
      );
    });

    it('every nav item renders an icon', () => {
      renderNav();
      const links = within(desktopNav()).getAllByRole('link');
      for (const link of links) {
        expect(link.querySelector('svg')).toBeInTheDocument();
      }
    });

    it('marks the current route as the active nav item', () => {
      renderNav(['/auctions/mine']);
      const nav = desktopNav();
      expect(within(nav).getByRole('link', { name: /my auctions/i })).toHaveAttribute(
        'aria-current',
        'page',
      );
      expect(within(nav).getByRole('link', { name: /^auctions$/i })).not.toHaveAttribute(
        'aria-current',
      );
    });

    it('shows nothing in the user block when signed out', () => {
      renderNav();
      expect(
        within(desktopNav()).queryByRole('button', { name: /log out/i }),
      ).not.toBeInTheDocument();
    });

    it('shows the signed-in user and a visible log out action', () => {
      useAuthStore.getState().setUser(SAMPLE_USER);
      renderNav();

      const nav = desktopNav();
      expect(within(nav).getByText('Juan Ballesteros')).toBeInTheDocument();
      expect(within(nav).getByText('Bogotá D.C.')).toBeInTheDocument();
      expect(within(nav).getByRole('button', { name: /log out/i })).toBeInTheDocument();
    });

    it('keeps the avatar circle from shrinking next to a long name', () => {
      useAuthStore.getState().setUser(SAMPLE_USER);
      renderNav();

      expect(within(desktopNav()).getByText('JB')).toHaveClass('shrink-0');
    });
  });

  describe('tablet icon rail (md..lg)', () => {
    function tabletNav(): HTMLElement {
      return screen.getByRole('navigation', { name: 'Tablet navigation' });
    }

    it('shows the brand name but not the subtitle, to fit the narrow rail', () => {
      renderNav();
      const nav = tabletNav();
      expect(within(nav).getByText('Thrift Loop')).toBeInTheDocument();
      expect(within(nav).queryByText('Secondhand Fashion')).not.toBeInTheDocument();
    });

    it('renders every nav item as an icon-only link, without a duplicate Create auction', () => {
      renderNav();
      const nav = tabletNav();
      expect(within(nav).getByRole('link', { name: /^auctions$/i })).toBeInTheDocument();
      expect(within(nav).getByRole('link', { name: /my auctions/i })).toBeInTheDocument();
      expect(within(nav).getByRole('link', { name: /my bids/i })).toBeInTheDocument();
      expect(within(nav).getByRole('link', { name: /my profile/i })).toBeInTheDocument();
      expect(within(nav).queryByRole('link', { name: /create auction/i })).not.toBeInTheDocument();
    });

    it('marks the current route as active', () => {
      renderNav(['/profile']);
      expect(within(tabletNav()).getByRole('link', { name: /my profile/i })).toHaveAttribute(
        'aria-current',
        'page',
      );
    });

    it('shows a log out icon button when signed in', () => {
      useAuthStore.getState().setUser(SAMPLE_USER);
      renderNav();
      expect(within(tabletNav()).getByRole('button', { name: /log out/i })).toBeInTheDocument();
    });
  });

  describe('mobile bottom tab bar (<md)', () => {
    function mobileNav(): HTMLElement {
      return screen.getByRole('navigation', { name: 'Mobile navigation' });
    }

    it('renders the four primary tabs', () => {
      renderNav();
      const nav = mobileNav();
      expect(within(nav).getByRole('link', { name: /^auctions$/i })).toHaveAttribute('href', '/');
      expect(within(nav).getByRole('link', { name: /my auctions/i })).toHaveAttribute(
        'href',
        '/auctions/mine',
      );
      expect(within(nav).getByRole('link', { name: /create/i })).toHaveAttribute(
        'href',
        '/auctions/new',
      );
      expect(within(nav).getByRole('link', { name: /profile/i })).toHaveAttribute(
        'href',
        '/profile',
      );
    });

    it('marks the current route as active', () => {
      renderNav(['/auctions/new']);
      expect(within(mobileNav()).getByRole('link', { name: /create/i })).toHaveAttribute(
        'aria-current',
        'page',
      );
    });

    it('does not show My purchases (kept off the 4-tab bar)', () => {
      renderNav();
      expect(
        within(mobileNav()).queryByRole('link', { name: /purchases/i }),
      ).not.toBeInTheDocument();
    });
  });
});
