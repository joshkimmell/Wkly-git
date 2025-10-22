import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi } from 'vitest';
import ConfirmModal from '../ConfirmModal';

describe('ConfirmModal', () => {
  test('renders title and message and calls onConfirm/onCancel', async () => {
  const onConfirm = vi.fn().mockResolvedValue(undefined);
  const onCancel = vi.fn();

    render(
      <ConfirmModal
        isOpen={true}
        title="Confirm?"
        message="Are you sure?"
        onConfirm={onConfirm}
        onCancel={onCancel}
        confirmLabel="Yes"
        cancelLabel="No"
      />
    );

    expect(screen.getByText('Confirm?')).toBeInTheDocument();
    expect(screen.getByText('Are you sure?')).toBeInTheDocument();

    fireEvent.click(screen.getByText('Yes'));

    await waitFor(() => {
      expect(onConfirm).toHaveBeenCalled();
    });

    fireEvent.click(screen.getByText('No'));
    expect(onCancel).toHaveBeenCalled();
  });

  test('shows loading state while confirming', async () => {
  let resolve: any = null;
  const promise = new Promise<void>((res) => { resolve = res; });
    const onConfirm = vi.fn().mockImplementation(() => promise);
      const onCancel = vi.fn();

    render(
      <ConfirmModal
        isOpen={true}
        title="Confirm?"
        message="Are you sure?"
        onConfirm={onConfirm}
        onCancel={onCancel}
        confirmLabel="Yes"
        cancelLabel="No"
      />
    );

    const btn = screen.getByText('Yes');
    fireEvent.click(btn);

    // button should show loading text
    expect(screen.getByText('Yes...')).toBeInTheDocument();

  // resolve promise
  resolve && resolve();

    await waitFor(() => {
      expect(onConfirm).toHaveBeenCalled();
    });
  });
});

