import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  NetworkSwitcher,
  PREDEFINED_ENVIRONMENTS,
  PREDEFINED_NETWORKS,
  normalizeUrl,
  isValidHttpUrl,
  validateEndpoint,
  CUSTOM_STORAGE_KEY,
} from './NetworkSwitcher';

// Mock useSoroban hook
const mockSetNetwork = vi.fn();
vi.mock('@/lib/soroban/SorobanProvider', () => ({
  useSoroban: () => ({
    network: {
      rpcUrl: 'https://soroban-testnet.stellar.org',
      networkPassphrase: 'Test SDF Network ; September 2015',
    },
    setNetwork: mockSetNetwork,
  }),
}));

describe('PREDEFINED_ENVIRONMENTS & NetworkSwitcher (#307)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.localStorage.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('PREDEFINED_ENVIRONMENTS constant export', () => {
    it('defines expected environments with names, rpcUrls, and passphrases', () => {
      expect(Array.isArray(PREDEFINED_ENVIRONMENTS)).toBe(true);
      expect(PREDEFINED_ENVIRONMENTS.length).toBeGreaterThanOrEqual(2);

      const testnet = PREDEFINED_ENVIRONMENTS.find((e) => e.name === 'Testnet');
      expect(testnet).toBeDefined();
      expect(testnet?.rpcUrl).toBe('https://soroban-testnet.stellar.org');
      expect(testnet?.networkPassphrase).toContain('Test SDF Network');

      const futurenet = PREDEFINED_ENVIRONMENTS.find((e) => e.name === 'Futurenet');
      expect(futurenet).toBeDefined();
      expect(futurenet?.rpcUrl).toBe('https://rpc-futurenet.stellar.org');
      expect(futurenet?.networkPassphrase).toContain('Test SDF Future Network');
    });

    it('all predefined environments have valid https URLs and non-empty passphrases', () => {
      for (const env of PREDEFINED_ENVIRONMENTS) {
        expect(env.rpcUrl.startsWith('https://')).toBe(true);
        expect(env.networkPassphrase.trim().length).toBeGreaterThan(0);
      }
    });

    it('exports matching PREDEFINED_NETWORKS', () => {
      expect(PREDEFINED_NETWORKS.length).toBeGreaterThanOrEqual(2);
      expect(PREDEFINED_NETWORKS.map((n) => n.key)).toEqual(
        expect.arrayContaining(['testnet', 'futurenet'])
      );
    });
  });

  describe('Utility functions', () => {
    it('normalizeUrl removes whitespace and trailing slashes', () => {
      expect(normalizeUrl('  https://rpc.example.com///  ')).toBe('https://rpc.example.com');
      expect(normalizeUrl('http://localhost:8000')).toBe('http://localhost:8000');
    });

    it('isValidHttpUrl validates HTTP and HTTPS URLs correctly', () => {
      expect(isValidHttpUrl('https://soroban-testnet.stellar.org')).toBe(true);
      expect(isValidHttpUrl('http://localhost:8000/rpc')).toBe(true);
      expect(isValidHttpUrl('ftp://example.com')).toBe(false);
      expect(isValidHttpUrl('invalid-url')).toBe(false);
      expect(isValidHttpUrl('')).toBe(false);
    });

    describe('validateEndpoint', () => {
      it('returns error if rpcUrl is empty', async () => {
        const result = await validateEndpoint('', 'passphrase');
        expect(result.ok).toBe(false);
        expect(result.message).toMatch(/Enter an RPC endpoint URL/i);
      });

      it('returns error if rpcUrl is not a valid http/https url', async () => {
        const result = await validateEndpoint('not-a-valid-url', 'passphrase');
        expect(result.ok).toBe(false);
        expect(result.message).toMatch(/Invalid endpoint/i);
      });

      it('returns error if network fetch fails / unreachable', async () => {
        vi.spyOn(globalThis, 'fetch').mockRejectedValueOnce(new Error('Connection refused'));
        const result = await validateEndpoint('https://offline-node.example.com', 'pass');
        expect(result.ok).toBe(false);
        expect(result.message).toMatch(/Endpoint unreachable/i);
      });

      it('returns error if response is not ok', async () => {
        vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
          ok: false,
          status: 502,
        } as Response);
        const result = await validateEndpoint('https://bad-gateway.example.com', 'pass');
        expect(result.ok).toBe(false);
        expect(result.message).toMatch(/HTTP 502/i);
      });

      it('returns error if response json is invalid or missing health status', async () => {
        vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
          ok: true,
          json: async () => ({ result: { status: 'degraded' } }),
        } as Response);
        const result = await validateEndpoint('https://node.example.com', 'pass');
        expect(result.ok).toBe(false);
        expect(result.message).toMatch(/not healthy/i);
      });

      it('returns error if network passphrase does not match', async () => {
        vi.spyOn(globalThis, 'fetch')
          .mockResolvedValueOnce({
            ok: true,
            json: async () => ({ result: { status: 'healthy' } }),
          } as Response)
          .mockResolvedValueOnce({
            ok: true,
            json: async () => ({ result: { passphrase: 'Wrong Passphrase' } }),
          } as Response);

        const result = await validateEndpoint('https://node.example.com', 'Expected Passphrase');
        expect(result.ok).toBe(false);
        expect(result.message).toMatch(/passphrase mismatch/i);
      });

      it('returns ok: true when health is healthy and passphrase matches', async () => {
        vi.spyOn(globalThis, 'fetch')
          .mockResolvedValueOnce({
            ok: true,
            json: async () => ({ result: { status: 'healthy' } }),
          } as Response)
          .mockResolvedValueOnce({
            ok: true,
            json: async () => ({ result: { passphrase: 'Valid Passphrase' } }),
          } as Response);

        const result = await validateEndpoint('https://node.example.com', 'Valid Passphrase');
        expect(result.ok).toBe(true);
        expect(result.message).toMatch(/Connection successful/i);
      });
    });
  });

  describe('NetworkSwitcher Component UI & Interactions', () => {
    it('renders network buttons for predefined options and custom', () => {
      render(<NetworkSwitcher />);
      expect(screen.getByRole('button', { name: 'Testnet' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Futurenet' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Custom' })).toBeInTheDocument();
      expect(screen.getByTestId('active-network-url')).toHaveTextContent(
        'https://soroban-testnet.stellar.org'
      );
    });

    it('switches to Futurenet when Futurenet button is clicked', () => {
      render(<NetworkSwitcher />);
      const futurenetButton = screen.getByRole('button', { name: 'Futurenet' });
      fireEvent.click(futurenetButton);

      expect(mockSetNetwork).toHaveBeenCalledWith({
        rpcUrl: 'https://rpc-futurenet.stellar.org',
        networkPassphrase: 'Test SDF Future Network ; October 2022',
      });
      expect(screen.getByTestId('active-network-url')).toHaveTextContent(
        'https://rpc-futurenet.stellar.org'
      );
    });

    it('toggles Custom panel with RPC inputs when Custom button is clicked', () => {
      render(<NetworkSwitcher />);
      expect(screen.queryByTestId('custom-network-panel')).not.toBeInTheDocument();

      const customButton = screen.getByRole('button', { name: 'Custom' });
      fireEvent.click(customButton);

      expect(screen.getByTestId('custom-network-panel')).toBeInTheDocument();
      expect(screen.getByLabelText(/Custom Soroban RPC endpoint/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/Expected network passphrase/i)).toBeInTheDocument();
    });

    it('loads stored custom endpoint configuration from localStorage on mount', () => {
      window.localStorage.setItem(
        CUSTOM_STORAGE_KEY,
        JSON.stringify({
          rpcUrl: 'https://stored-node.com',
          networkPassphrase: 'Stored Passphrase',
        })
      );

      render(<NetworkSwitcher />);
      const customButton = screen.getByRole('button', { name: 'Custom' });
      fireEvent.click(customButton);

      const urlInput = screen.getByLabelText(/Custom Soroban RPC endpoint/i) as HTMLInputElement;
      const passInput = screen.getByLabelText(/Expected network passphrase/i) as HTMLInputElement;

      expect(urlInput.value).toBe('https://stored-node.com');
      expect(passInput.value).toBe('Stored Passphrase');
    });

    it('tests connection and allows saving upon successful validation', async () => {
      vi.spyOn(globalThis, 'fetch')
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ result: { status: 'healthy' } }),
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ result: { passphrase: 'Custom Passphrase' } }),
        } as Response);

      render(<NetworkSwitcher />);
      fireEvent.click(screen.getByRole('button', { name: 'Custom' }));

      const urlInput = screen.getByLabelText(/Custom Soroban RPC endpoint/i);
      const passInput = screen.getByLabelText(/Expected network passphrase/i);
      const testBtn = screen.getByRole('button', { name: /Test connection/i });
      const saveBtn = screen.getByRole('button', { name: /Save & activate/i });

      expect(saveBtn).toBeDisabled();

      fireEvent.change(urlInput, { target: { value: 'https://custom-node.stellar.org' } });
      fireEvent.change(passInput, { target: { value: 'Custom Passphrase' } });

      fireEvent.click(testBtn);

      await waitFor(() => {
        expect(screen.getByRole('status')).toHaveTextContent(/Connection successful/i);
      });

      expect(saveBtn).not.toBeDisabled();
      fireEvent.click(saveBtn);

      expect(mockSetNetwork).toHaveBeenCalledWith({
        rpcUrl: 'https://custom-node.stellar.org',
        networkPassphrase: 'Custom Passphrase',
      });
      expect(window.localStorage.getItem(CUSTOM_STORAGE_KEY)).toContain(
        'https://custom-node.stellar.org'
      );
    });
  });
});
