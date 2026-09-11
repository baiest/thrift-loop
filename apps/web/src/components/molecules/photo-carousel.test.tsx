import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PhotoCarousel } from './photo-carousel.js';

const PHOTOS = ['/photo-1.jpg', '/photo-2.jpg', '/photo-3.jpg'];

describe('PhotoCarousel', () => {
  it('shows a placeholder when there are no photos', () => {
    render(<PhotoCarousel photoUrls={[]} category="jeans" />);

    expect(screen.getByLabelText('No photo')).toBeInTheDocument();
  });

  it('renders a single photo with no navigation controls', () => {
    render(<PhotoCarousel photoUrls={['/photo-1.jpg']} category="jeans" />);

    expect(screen.getByRole('img')).toHaveAttribute('src', '/photo-1.jpg');
    expect(screen.queryByRole('button', { name: 'Next photo' })).not.toBeInTheDocument();
  });

  it('starts on the first photo and shows a dot per photo', () => {
    render(<PhotoCarousel photoUrls={PHOTOS} category="jeans" />);

    expect(screen.getByRole('img')).toHaveAttribute('src', PHOTOS[0]);
    expect(screen.getAllByRole('button', { name: /^Go to photo \d$/u })).toHaveLength(3);
  });

  it.each([
    { label: 'advances to the next photo', clicks: 1, expectedIndex: 1 },
    { label: 'wraps from the last photo back to the first', clicks: 3, expectedIndex: 0 },
  ])('$label on repeated "Next photo" clicks', async ({ clicks, expectedIndex }) => {
    const user = userEvent.setup();
    render(<PhotoCarousel photoUrls={PHOTOS} category="jeans" />);

    const next = screen.getByRole('button', { name: 'Next photo' });
    for (let i = 0; i < clicks; i += 1) {
      await user.click(next);
    }

    // eslint-disable-next-line security/detect-object-injection -- expectedIndex is a fixture value, not user input
    expect(screen.getByRole('img')).toHaveAttribute('src', PHOTOS[expectedIndex]);
  });

  it('goes to the previous photo, wrapping past the first', async () => {
    const user = userEvent.setup();
    render(<PhotoCarousel photoUrls={PHOTOS} category="jeans" />);

    await user.click(screen.getByRole('button', { name: 'Previous photo' }));

    expect(screen.getByRole('img')).toHaveAttribute('src', PHOTOS[2]);
  });

  it('jumps to a photo by clicking its dot', async () => {
    const user = userEvent.setup();
    render(<PhotoCarousel photoUrls={PHOTOS} category="jeans" />);

    await user.click(screen.getByRole('button', { name: 'Go to photo 3' }));

    expect(screen.getByRole('img')).toHaveAttribute('src', PHOTOS[2]);
  });

  it('falls back to a placeholder when the current photo fails to load', async () => {
    render(<PhotoCarousel photoUrls={['/broken.jpg']} category="jeans" />);

    screen.getByRole('img').dispatchEvent(new Event('error'));

    expect(await screen.findByLabelText('No photo')).toBeInTheDocument();
  });
});
