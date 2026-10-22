import { describe, expect, it } from "vitest";
import { MOCK_CONTRACT_INFO } from "./mock-data";

describe("MOCK_CONTRACT_INFO", () => {
  it("has every ContractInfo field as a non-empty string", () => {
    for (const key of ["version", "network", "address", "admin", "relay_signer", "health"] as const) {
      expect(typeof MOCK_CONTRACT_INFO[key]).toBe("string");
      expect(MOCK_CONTRACT_INFO[key].length).toBeGreaterThan(0);
    }
  });

  it("is marked as mock data on testnet", () => {
    expect(MOCK_CONTRACT_INFO.version).toContain("mock");
    expect(MOCK_CONTRACT_INFO.network).toBe("testnet");
  });

  it("starts with unknown health", () => {
    expect(MOCK_CONTRACT_INFO.health).toBe("unknown");
  });

  it("uses distinct addresses for contract, admin and relay signer", () => {
    const addrs = [MOCK_CONTRACT_INFO.address, MOCK_CONTRACT_INFO.admin, MOCK_CONTRACT_INFO.relay_signer];
    expect(new Set(addrs).size).toBe(3);
  });
});
