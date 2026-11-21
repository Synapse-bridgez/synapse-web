import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useLiveTransactions } from './useLiveTransactions';

vi.mock('./rateLimiter', () => ({
  rateLimitedFetch: vi.fn(),
}));

import { rateLimitedFetch } from './rateLimiter';

const mockedFetch = vi.mocked(rateLimitedFetch);

function setVisibility(state: 'visible' | 'hidden') {
  Object.defineProperty(document, 'visibilityState', {
    configurable: true,
    get: () => state,
  });
  document.dispatchEvent(new Event('visibilitychange'));
}

describe('useLiveTransactions', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    mockedFetch.mockReset();
    mockedFetch.mockResolvedValue({
      ok: true,
      json: async () => [],
    } as unknown as Response);
    Object.defineProperty(document, 'visibilityState', {
      configurable: true,
      get: () => 'visible',
    });
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('does not poll while the tab is hidden', async () => {
    const { unmount } = renderHook(() => useLiveTransactions({ intervalMs: 1000 }));

    await act(async () => {
      await vi.advanceTimersByTimeAsync(0);
    });
    expect(mockedFetch).toHaveBeenCalledTimes(1);

    act(() => {
      setVisibility('hidden');
    });

    await act(async () => {
      await vi.advanceTimersByTimeAsync(5000);
    });
    expect(mockedFetch).toHaveBeenCalledTimes(1);

    act(() => {
      setVisibility('visible');
    });

    await act(async () => {
      await vi.advanceTimersByTimeAsync(1000);
    });
    expect(mockedFetch).toHaveBeenCalledTimes(2);

    unmount();
  });
});
