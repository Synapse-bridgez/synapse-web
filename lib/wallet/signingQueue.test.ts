import { describe, it, expect, vi, beforeEach } from 'vitest';
import { enqueueSignature, classifySigningError } from './signingQueue';

describe('signingQueue error context', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('surfaces a specific message for user rejection', async () => {
    const original = Object.assign(new Error('User rejected the request'), {
      code: 4001,
    });

    const result = await enqueueSignature(async () => {
      throw original;
    });

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.message).toContain('rejected');
    expect(result.error.message).not.toBe('Signing failed');
    expect(result.error.cause).toBe(original);
    expect((result.error as { code?: number }).code).toBe(4001);
  });

  it('surfaces a specific message when the wallet is not connected', async () => {
    const original = Object.assign(new Error('Wallet not connected'), {
      code: 'WALLET_NOT_CONNECTED',
    });

    const result = await enqueueSignature(async () => {
      throw original;
    });

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.message).toContain('not connected');
    expect(result.error.message).not.toBe('Signing failed');
    expect(result.error.cause).toBe(original);
  });

  it('surfaces a specific message for transport errors', async () => {
    const original = new Error('Network request failed');

    const result = await enqueueSignature(async () => {
      throw original;
    });

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.message).toContain('network');
    expect(result.error.message).not.toBe('Signing failed');
    expect(result.error.cause).toBe(original);
  });

  it('produces distinct messages across categories', () => {
    const rejected = classifySigningError(
      Object.assign(new Error('User rejected the request'), { code: 4001 }),
    );
    const disconnected = classifySigningError(
      Object.assign(new Error('Wallet not connected'), {
        code: 'WALLET_NOT_CONNECTED',
      }),
    );
    const transport = classifySigningError(new Error('Network request failed'));

    const messages = new Set([
      rejected.message,
      disconnected.message,
      transport.message,
    ]);
    expect(messages.size).toBe(3);
  });
});
