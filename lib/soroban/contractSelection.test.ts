import { describe, expect, it } from "vitest";
import { selectContract } from "./contractSelection";

const contracts = [
  { id: "CAAA" },
  { id: "CBBB" },
];

describe("selectContract", () => {
  it("returns the stored contract when it exists", () => {
    expect(selectContract("CBBB", contracts)).toEqual({
      status: "found",
      contract: { id: "CBBB" },
    });
  });

  it("reports a missing state when the stored id is absent from the list", () => {
    expect(selectContract("CUNKNOWN", contracts)).toEqual({
      status: "missing",
      storedId: "CUNKNOWN",
    });
  });

  it("falls back to the first contract only when there is no stored id", () => {
    expect(selectContract(null, contracts)).toEqual({
      status: "none",
      contract: { id: "CAAA" },
    });
    expect(selectContract(undefined, contracts)).toEqual({
      status: "none",
      contract: { id: "CAAA" },
    });
  });
});
