import { render, screen, waitFor } from '@testing-library/react';
import DripsWidget from './DripsWidget';

describe('DripsWidget', () => {
  beforeEach(() => {
    jest.resetModules();
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => [
        { login: 'octocat', avatar_url: 'https://example.com/octocat.png', contributions: 42 },
      ],
    }) as unknown as typeof fetch;
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('fetches contributors only once across two mounts', async () => {
    const { unmount } = render(<DripsWidget />);
    await waitFor(() => expect(screen.getByText('octocat')).toBeInTheDocument());
    unmount();

    render(<DripsWidget />);
    await waitFor(() => expect(screen.getByText('octocat')).toBeInTheDocument());

    expect(global.fetch).toHaveBeenCalledTimes(1);
  });
});
