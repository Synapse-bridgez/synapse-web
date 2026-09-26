import { Address, nativeToScVal, xdr } from "@stellar/stellar-sdk";

export function addressArg(value: string) {
  return new Address(value).toScVal();
}

export function stringArg(value: string) {
  return nativeToScVal(value, { type: "string" });
}

/** Encodes a plain object as an ScVal map — used for #[contracttype] struct arguments. */
export function structArg(value: Record<string, unknown>) {
  return nativeToScVal(value);
}

/**
 * Parameter type descriptors used by the DocsTab ABI playground to generate a
 * form field per entrypoint argument. Kept in sync with the encoders below so
 * adding a new type only requires a new case in `encodeArg`.
 */
export type ArgType =
  | "address"
  | "string"
  | "u32"
  | "i32"
  | "u64"
  | "i64"
  | "u128"
  | "i128"
  | "bool"
  | "symbol"
  | "bytes"
  | "struct";

/**
 * Encodes a single playground form value into an ScVal based on its declared
 * ABI type. Reuses the existing helpers for address/string/struct so the
 * playground stays consistent with the rest of the app.
 */
export function encodeArg(type: ArgType, raw: string): xdr.ScVal {
  switch (type) {
    case "address":
      return addressArg(raw.trim());
    case "string":
      return stringArg(raw);
    case "symbol":
      return nativeToScVal(raw.trim(), { type: "symbol" });
    case "bool":
      return nativeToScVal(raw.trim().toLowerCase() === "true", { type: "bool" });
    case "bytes":
      return nativeToScVal(Buffer.from(raw.trim(), "hex"), { type: "bytes" });
    case "u32":
      return nativeToScVal(Number(raw), { type: "u32" });
    case "i32":
      return nativeToScVal(Number(raw), { type: "i32" });
    case "u64":
      return nativeToScVal(BigInt(raw.trim()), { type: "u64" });
    case "i64":
      return nativeToScVal(BigInt(raw.trim()), { type: "i64" });
    case "u128":
      return nativeToScVal(BigInt(raw.trim()), { type: "u128" });
    case "i128":
      return nativeToScVal(BigInt(raw.trim()), { type: "i128" });
    case "struct":
      return structArg(JSON.parse(raw) as Record<string, unknown>);
    default: {
      const exhaustive: never = type;
      throw new Error(`Unsupported ABI argument type: ${String(exhaustive)}`);
    }
  }
}

/**
 * Encodes an ordered list of playground form values into the ScVal argument
 * vector expected by a contract call, using each parameter's declared type.
 */
export function encodeArgs(
  params: { name: string; type: ArgType }[],
  values: Record<string, string>,
): xdr.ScVal[] {
  return params.map((param) => encodeArg(param.type, values[param.name] ?? ""));
}
