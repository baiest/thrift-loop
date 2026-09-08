import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PhotoUploader } from './photo-uploader.js';

function makeFile(name: string, type: string, sizeBytes?: number): File {
  const file = new File(['x'], name, { type });
  if (sizeBytes !== undefined) {
    Object.defineProperty(file, 'size', { value: sizeBytes });
  }
  return file;
}

describe('PhotoUploader', () => {
  it('shows how many photos are selected out of the max', () => {
    render(<PhotoUploader files={[]} onChange={vi.fn()} />);
    expect(screen.getByText('0/10 photos')).toBeInTheDocument();
  });

  it('adds a valid selected file', async () => {
    const onChange = vi.fn();
    render(<PhotoUploader files={[]} onChange={onChange} />);

    const input = screen.getByLabelText(/add photos/i);
    await userEvent.upload(input, makeFile('front.jpg', 'image/jpeg'));

    expect(onChange).toHaveBeenCalledWith([expect.objectContaining({ name: 'front.jpg' })]);
  });

  it('rejects a disallowed file type with an error message', () => {
    const onChange = vi.fn();
    render(<PhotoUploader files={[]} onChange={onChange} />);

    // fireEvent bypasses userEvent's accept-attribute filtering, so this
    // exercises our own validation (a real defense: accept is only a hint —
    // drag-and-drop and other browsers can still deliver a disallowed file).
    const input = screen.getByLabelText(/add photos/i);
    fireEvent.change(input, { target: { files: [makeFile('notes.txt', 'text/plain')] } });

    expect(onChange).not.toHaveBeenCalled();
    expect(screen.getByRole('alert')).toBeInTheDocument();
  });

  it('rejects a file over the size limit', async () => {
    const onChange = vi.fn();
    render(<PhotoUploader files={[]} onChange={onChange} />);

    const input = screen.getByLabelText(/add photos/i);
    const tooBig = makeFile('big.jpg', 'image/jpeg', 6 * 1024 * 1024);
    await userEvent.upload(input, tooBig);

    expect(onChange).not.toHaveBeenCalled();
    expect(screen.getByRole('alert')).toBeInTheDocument();
  });

  it('caps the total number of photos at the max', async () => {
    const onChange = vi.fn();
    const existing = Array.from({ length: 9 }, (_unused, i) => makeFile(`p${i}.jpg`, 'image/jpeg'));
    render(<PhotoUploader files={existing} onChange={onChange} />);

    const input = screen.getByLabelText(/add photos/i);
    await userEvent.upload(input, [
      makeFile('a.jpg', 'image/jpeg'),
      makeFile('b.jpg', 'image/jpeg'),
    ]);

    expect(onChange).toHaveBeenCalledWith(expect.arrayContaining([expect.anything()]));
    const calledWith = onChange.mock.calls[0]?.[0] as File[];
    expect(calledWith).toHaveLength(10);
  });

  it('disables the input once the max is reached', () => {
    const existing = Array.from({ length: 10 }, (_unused, i) =>
      makeFile(`p${i}.jpg`, 'image/jpeg'),
    );
    render(<PhotoUploader files={existing} onChange={vi.fn()} />);

    expect(screen.getByLabelText(/add photos/i)).toBeDisabled();
  });

  it('removes a photo when its remove button is clicked', async () => {
    const onChange = vi.fn();
    const existing = [makeFile('front.jpg', 'image/jpeg'), makeFile('back.jpg', 'image/jpeg')];
    render(<PhotoUploader files={existing} onChange={onChange} />);

    await userEvent.click(screen.getAllByRole('button', { name: /remove/i })[0] as HTMLElement);

    expect(onChange).toHaveBeenCalledWith([existing[1]]);
  });
});
