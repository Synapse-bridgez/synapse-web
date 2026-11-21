import { describe, expect, it } from "vitest";

import {
  ConfigError,
  NETWORKS,
  PRODUCTION_REQUIRED_KEYS,
  isDeployment,
  loadConfig,
  readConfig,
  resolveNetwork,
  resolveRpcUrl,
} from "./env";

/** A syntactically valid `C...` contract id. */
const VALID_CONTRACT = `C${"A".repeat(55)}`;

/**
 * Feeds a deliberately invalid value past the static type.
 *
 * The `Env` type is narrow by design, so the negative tests cannot construct
 * their own inputs without a cast. Doing it here keeps each test readable and
 * makes the escape hatch greppable.
 */
function invalidConfig(values: Record<string, unknown>): Record<string, string> {
  return values as Record<string, string>;
}

describe("loadConfig — valid configurations", () => {
  it("defaults to testnet when nothing is set", () => {
    const result = loadConfig({}, false);

    expect(result.ok).toBe(true);
    expect(result.env?.NEXT_PUBLIC_NETWORK).toBe("testnet");
    expect(result.env?.NEXT_PUBLIC_CONTRACT_ID).toBeUndefined();
  });

  it("accepts a full testnet configuration", () => {
    const result = loadConfig(
      {
        NEXT_PUBLIC_NETWORK: "testnet",
        NEXT_PUBLIC_SOROBAN_RPC_URL: "https://soroban-testnet.stellar.org",
        NEXT_PUBLIC_CONTRACT_ID: VALID_CONTRACT,
        NEXT_PUBLIC_SITE_URL: "https://synapse.example.com",
      },
      true
    );

    expect(result.ok).toBe(true);
    expect(result.errors).toEqual([]);
  });

  it("accepts a futurenet configuration with the futurenet endpoint", () => {
    const result = loadConfig(
      {
        NEXT_PUBLIC_NETWORK: "futurenet",
        NEXT_PUBLIC_SOROBAN_RPC_URL: "https://rpc-futurenet.stellar.org",
        NEXT_PUBLIC_CONTRACT_ID: VALID_CONTRACT,
      },
      true
    );

    expect(result.ok).toBe(true);
    expect(result.env?.NEXT_PUBLIC_NETWORK).toBe("futurenet");
  });

  it("allows a local endpoint for the local network", () => {
    const result = loadConfig(
      { NEXT_PUBLIC_NETWORK: "local", NEXT_PUBLIC_SOROBAN_RPC_URL: "http://localhost:8000" },
      false
    );

    expect(result.ok).toBe(true);
  });

  it("tolerates a non-default port on the canonical host", () => {
    const result = loadConfig(
      {
        NEXT_PUBLIC_NETWORK: "testnet",
        NEXT_PUBLIC_SOROBAN_RPC_URL: "https://soroban-testnet.stellar.org:8443",
      },
      false
    );

    expect(result.ok).toBe(true);
  });
});

describe("loadConfig — empty and whitespace-only values", () => {
  it("treats an empty required RPC url as missing", () => {
    const result = loadConfig({ NEXT_PUBLIC_SOROBAN_RPC_URL: "" }, true);

    expect(result.ok).toBe(false);
    expect(result.errors.join("\n")).toMatch(/NEXT_PUBLIC_SOROBAN_RPC_URL/);
    expect(result.errors.join("\n")).toMatch(/missing|required/i);
  });

  it("treats a whitespace-only required RPC url as missing", () => {
    const result = loadConfig({ NEXT_PUBLIC_SOROBAN_RPC_URL: "   " }, true);

    expect(result.ok).toBe(false);
    expect(result.errors.join("\n")).toMatch(/NEXT_PUBLIC_SOROBAN_RPC_URL/);
  });

  it("treats an empty required contract id as missing", () => {
    const result = loadConfig({ NEXT_PUBLIC_CONTRACT_ID: "" }, true);

    expect(result.ok).toBe(false);
    expect(result.errors.join("\n")).toMatch(/NEXT_PUBLIC_CONTRACT_ID/);
  });

  it("treats a whitespace-only required contract id as missing", () => {
    const result = loadConfig({ NEXT_PUBLIC_CONTRACT_ID: "   " }, true);

    expect(result.ok).toBe(false);
    expect(result.errors.join("\n")).toMatch(/NEXT_PUBLIC_CONTRACT_ID/);
  });

  it("falls back to the default network when set to an empty string", () => {
    const result = loadConfig({ NEXT_PUBLIC_NETWORK: "" }, false);

    expect(result.ok).toBe(true);
    expect(result.env?.NEXT_PUBLIC_NETWORK).toBe("testnet");
  });

  it("falls back to the default network when set to whitespace", () => {
    const result = loadConfig({ NEXT_PUBLIC_NETWORK: "   " }, false);

    expect(result.ok).toBe(true);
    expect(result.env?.NEXT_PUBLIC_NETWORK).toBe("testnet");
  });

  it("treats an empty optional site url as unset", () => {
    const result = loadConfig({ NEXT_PUBLIC_SITE_URL: "" }, false);

    expect(result.ok).toBe(true);
    expect(result.env?.NEXT_PUBLIC_SITE_URL).toBeUndefined();
  });

  it("treats a whitespace-only optional site url as unset", () => {
    const result = loadConfig({ NEXT_PUBLIC_SITE_URL: "   " }, false);

    expect(result.ok).toBe(true);
    expect(result.env?.NEXT_PUBLIC_SITE_URL).toBeUndefined();
  });

  it("still accepts a valid required RPC url", () => {
    const result = loadConfig(
      { NEXT_PUBLIC_SOROBAN_RPC_URL: "https://soroban-testnet.stellar.org" },
      true
    );

    expect(result.ok).toBe(true);
    expect(result.env?.NEXT_PUBLIC_SOROBAN_RPC_URL).toBe(
      "https://soroban-testnet.stellar.org"
    );
  });
});

describe("loadConfig — deliberately malformed configurations", () => {
  it("rejects a contract id that is not a C-address", () => {
    const result = loadConfig({ NEXT_PUBLIC_CONTRACT_ID: "not-a-contract" }, false);

    expect(result.ok).toBe(false);
    expect(result.errors.join("\n")).toMatch(/NEXT_PUBLIC_CONTRACT_ID/);
    expect(result.errors.join("\n")).toMatch(/C.*55/);
  });

  it("rejects a G-account where a contract id belongs", () => {
    const result = loadConfig({ NEXT_PUBLIC_CONTRACT_ID: `G${"A".repeat(55)}` }, false);

    expect(result.ok).toBe(false);
  });

  it("names the common trailing-space mistake in the message", () => {
    const result = loadConfig({ NEXT_PUBLIC_CONTRACT_ID: ` ${VALID_CONTRACT} ` }, false);

    expect(result.ok).toBe(false);
    expect(result.errors.join("\n")).toMatch(/leading or trailing space/);
  });

  it("rejects a relative RPC url", () => {
    const result = loadConfig(
      { NEXT_PUBLIC_SOROBAN_RPC_URL: "soroban-testnet.stellar.org" },
      false
    );

    expect(result.ok).toBe(false);
    expect(result.errors.join("\n")).toMatch(/absolute http or https URL/);
  });

  it("rejects an empty RPC url", () => {
    const result = loadConfig({ NEXT_PUBLIC_SOROBAN_RPC_URL: "" }, false);

    expect(result.ok).toBe(false);
  });

  it("accepts a plain http url for a local node", () => {
    const result = loadConfig(
      { NEXT_PUBLIC_NETWORK: "local", NEXT_PUBLIC_SOROBAN_RPC_URL: "http://localhost:8000" },
      false
    );

    expect(result.ok).toBe(true);
  });

  it("rejects an unknown network name and lists the valid ones", () => {
    const result = loadConfig(invalidConfig({ NEXT_PUBLIC_NETWORK: "mainnet" }), false);

    expect(result.ok).toBe(false);
    expect(result.errors.join("\n")).toMatch(/testnet/);
  });

  it("rejects a non-absolute site url", () => {
    const result = loadConfig({ NEXT_PUBLIC_SITE_URL: "synapse.example.com" }, false);

    expect(result.ok).toBe(false);
    expect(result.errors.join("\n")).toMatch(/NEXT_PUBLIC_SITE_URL/);
  });

  it("reports every problem at once, not just the first", () => {
    const result = loadConfig(
      invalidConfig({
        NEXT_PUBLIC_CONTRACT_ID: "nope",
        NEXT_PUBLIC_SITE_URL: "nope",
        NEXT_PUBLIC_NETWORK: "bogus",
      }),
      false
    );

    expect(result.ok).toBe(false);
    // One issue per bad key, so a single CI run surfaces all of them.
    expect(result.errors.length).toBe(3);
  });

  it("still cross-validates the RPC pairing when a field is malformed", () => {
    // Cross-validation must survive a shape failure, otherwise a developer with
    // both problems fixes one, rebuilds, and only then learns about the other.
    const result = loadConfig(
      invalidConfig({
        NEXT_PUBLIC_CONTRACT_ID: "nope",
        NEXT_PUBLIC_NETWORK: "testnet",
        NEXT_PUBLIC_SOROBAN_RPC_URL: "https://rpc-futurenet.stellar.org",
      }),
      false
    );

    expect(result.ok).toBe(false);
    expect(result.errors).toHaveLength(2);
    expect(result.errors.join("\n")).toMatch(/NEXT_PUBLIC_CONTRACT_ID/);
    expect(result.errors.join("\n")).toMatch(/soroban-testnet\.stellar\.org/);
  });

  it("withholds the env object when validation failed", () => {
    // Handing back a partially-valid env would let a caller read a value the
    // errors already rejected.
    const result = loadConfig({ NEXT_PUBLIC_CONTRACT_ID: "nope" }, false);

    expect(result.ok).toBe(false);
    expect(result.env).toBeUndefined();
  });

  it("does not double-report a bad RPC url as both shape and pairing problems", () => {
    const result = loadConfig(
      { NEXT_PUBLIC_NETWORK: "testnet", NEXT_PUBLIC_SOROBAN_RPC_URL: "not-a-url" },
      false
    );

    expect(result.ok).toBe(false);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0]).toMatch(/absolute http or https URL/);
  });

  it("does not attempt a pairing check on a non-http scheme", () => {
    // A well-formed but wrong-scheme URL should fail shape validation only. If
    // the pairing check tried to parse it as an endpoint it would either throw
    // or invent a second, misleading error.
    const result = loadConfig(
      {
        NEXT_PUBLIC_NETWORK: "testnet",
        NEXT_PUBLIC_SOROBAN_RPC_URL: "ftp://soroban-testnet.stellar.org",
      },
      false
    );

    expect(result.ok).toBe(false);
    expect(result.errors).toHaveLength(1);
  });

  it("treats a missing env object as an empty one rather than throwing", () => {
    // `process.env` is always an object in practice, but a nullish read should
    // degrade to "nothing configured" instead of a TypeError.
    const result = loadConfig(undefined as unknown as Record<string, string>, false);

    expect(result.ok).toBe(true);
    expect(result.env?.NEXT_PUBLIC_NETWORK).toBe("testnet");
  });
});

describe("loadConfig — network / RPC cross-validation", () => {
  it("rejects a testnet build pointed at the futurenet RPC", () => {
    const result = loadConfig(
      {
        NEXT_PUBLIC_NETWORK: "testnet",
        NEXT_PUBLIC_SOROBAN_RPC_URL: "https://rpc-futurenet.stellar.org",
      },
      false
    );

    expect(result.ok).toBe(false);
    expect(result.errors.join("\n")).toMatch(/soroban-testnet\.stellar\.org/);
  });

  it("rejects a futurenet build pointed at the testnet RPC", () => {
    const result = loadConfig(
      {
        NEXT_PUBLIC_NETWORK: "futurenet",
        NEXT_PUBLIC_SOROBAN_RPC_URL: "https://soroban-testnet.stellar.org",
      },
      false
    );

    expect(result.ok).toBe(false);
    expect(result.errors.join("\n")).toMatch(/rpc-futurenet\.stellar\.org/);
  });
});
