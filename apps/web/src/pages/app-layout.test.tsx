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
});
