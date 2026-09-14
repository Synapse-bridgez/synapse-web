import { Address, nativeToScVal } from "@stellar/stellar-sdk";

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
