import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { AppLayout } from './app-layout.js';

function renderLayout(): void {
  render(
    <MemoryRouter initialEntries={['/child']}>
      <Routes>
        <Route element={<AppLayout />}>
          <Route path="/child" element={<p>child content</p>} />
        </Route>
      </Routes>
    </MemoryRouter>,
  );
}

describe('AppLayout', () => {
  it('renders the routed page content with no hamburger menu', () => {
    renderLayout();

    expect(screen.queryByRole('button', { name: /menu/i })).not.toBeInTheDocument();
    expect(screen.getByText('child content')).toBeInTheDocument();
  });

  it('offsets the main content to clear the desktop sidebar and the tablet rail', () => {
    renderLayout();

    const main = screen.getByRole('main');
    expect(main).toHaveClass('lg:ml-64');
    expect(main).toHaveClass('md:ml-[72px]');
  });

  it('pads the bottom of the content to clear the mobile tab bar', () => {
    renderLayout();

    expect(screen.getByRole('main')).toHaveClass('pb-20');
  });

  it('centers content in the space left over from the sidebar, not the full viewport', () => {
    renderLayout();

    const main = screen.getByRole('main');
    // Centering (mx-auto) must live on an element INSIDE the offset `main`,
    // not on `main` itself — mx-auto and the ml-64 offset both set
    // margin-left, and ml-64 always wins, so combining them on one element
    // pins content flush against the sidebar with all the slack on the right.
    expect(main).not.toHaveClass('mx-auto');
    expect(main).not.toHaveClass('max-w-7xl');

    const centeredWrapper = screen.getByText('child content').closest('.mx-auto');
    expect(centeredWrapper).toHaveClass('max-w-7xl');
  });
});
