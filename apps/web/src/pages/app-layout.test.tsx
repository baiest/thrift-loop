import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { AppLayout } from './app-layout.js';

describe('AppLayout', () => {
  it('renders the sidebar toggle and the routed page content', () => {
    render(
      <MemoryRouter initialEntries={['/child']}>
        <Routes>
          <Route element={<AppLayout />}>
            <Route path="/child" element={<p>child content</p>} />
          </Route>
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getByRole('button', { name: /menu/i })).toBeInTheDocument();
    expect(screen.getByText('child content')).toBeInTheDocument();
  });
});
