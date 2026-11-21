import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import EndpointPlayground from './EndpointPlayground';

describe('EndpointPlayground', () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it('clears the spinner and shows the error when the request rejects', async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error('Network unreachable'));

    render(<EndpointPlayground />);

    const sendButton = screen.getByRole('button', { name: /send/i });
    await userEvent.click(sendButton);

    await waitFor(() => {
      expect(screen.queryByRole('status')).not.toBeInTheDocument();
    });

    expect(screen.getByText(/network unreachable/i)).toBeInTheDocument();
  });
});
