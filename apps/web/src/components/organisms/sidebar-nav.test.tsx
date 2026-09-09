import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { SidebarNav } from './sidebar-nav.js';

function renderNav(): void {
  render(
    <MemoryRouter>
      <SidebarNav />
    </MemoryRouter>,
  );
}

describe('SidebarNav', () => {
  it('starts closed on small screens, with a toggle button', () => {
    renderNav();
    expect(screen.getByRole('button', { name: /menu/i })).toBeInTheDocument();
    expect(screen.queryByRole('navigation', { hidden: true })).not.toBeVisible();
  });

  it('opens the drawer when the toggle is clicked', async () => {
    renderNav();

    await userEvent.click(screen.getByRole('button', { name: /menu/i }));

    expect(screen.getByRole('navigation')).toBeVisible();
  });

  it('has "Create auction" as the first nav item, linking to /auctions/new', async () => {
    renderNav();
    await userEvent.click(screen.getByRole('button', { name: /menu/i }));

    const links = screen.getAllByRole('link');
    expect(links[0]).toHaveTextContent(/create auction/i);
    expect(links[0]).toHaveAttribute('href', '/auctions/new');
  });

  it('links to auctions, purchases, and profile', async () => {
    renderNav();
    await userEvent.click(screen.getByRole('button', { name: /menu/i }));

    expect(screen.getByRole('link', { name: /^auctions$/i })).toHaveAttribute('href', '/');
    expect(screen.getByRole('link', { name: /my purchases/i })).toHaveAttribute(
      'href',
      '/purchases',
    );
    expect(screen.getByRole('link', { name: /my profile/i })).toHaveAttribute('href', '/profile');
  });

  it('closes the drawer after a nav link is clicked', async () => {
    renderNav();
    await userEvent.click(screen.getByRole('button', { name: /menu/i }));
    await userEvent.click(screen.getByRole('link', { name: /create auction/i }));

    expect(screen.queryByRole('navigation', { hidden: true })).not.toBeVisible();
  });
});
