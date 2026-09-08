import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { CreateAuctionPage } from './create-auction-page.js';

describe('CreateAuctionPage', () => {
  it('renders the create auction form', () => {
    render(
      <MemoryRouter>
        <CreateAuctionPage />
      </MemoryRouter>,
    );

    expect(screen.getByRole('heading', { name: /create auction/i })).toBeInTheDocument();
    expect(screen.getByLabelText('Category')).toBeInTheDocument();
  });
});
