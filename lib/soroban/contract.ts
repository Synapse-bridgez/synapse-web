import {
  BASE_FEE,
  Contract,
  TransactionBuilder,
  rpc,
  xdr,
  type Transaction,
} from "@stellar/stellar-sdk";
import { StellarWalletsKit } from "@/lib/wallet/kit";

export { addressArg, stringArg, structArg } from "./args";

const NETWORK_PASSPHRASE = "Test SDF Network ; September 2015";

export interface ContractCallResult {
  status: "SUCCESS" | "FAILED";
  hash: string;
}

/**
 * Result of a pre-submit simulation preview for a state-changing call.
 * `ok: false` means the call would revert and submission must be blocked.
 */
export interface ContractCallPreview {
  ok: boolean;
  method: string;
  /** Estimated total fee in stroops, derived from the simulation. */
  estimatedFee: string;
  /** Human-readable revert reason when `ok` is false. */
  revertReason?: string;
  /** Raw simulation result for callers that need to inspect return values. */
  simulation?: unknown;
}

/**
 * Builds, simulates, signs (via the connected wallet), submits, and polls a
 * Soroban contract invocation to completion.
 */
export async function invokeContract(
  rpcUrl: string,
  contractId: string,
  sourceAddress: string,
  method: string,
  args: xdr.ScVal[] = []
): Promise<ContractCallResult> {
  const server = new rpc.Server(rpcUrl);
  const account = await server.getAccount(sourceAddress);
  const contract = new Contract(contractId);

  const tx = new TransactionBuilder(account, {
    fee: BASE_FEE,
    networkPassphrase: NETWORK_PASSPHRASE,
  })
    .addOperation(contract.call(method, ...args))
    .setTimeout(30)
    .build();

  const prepared = await server.prepareTransaction(tx);

  const { signedTxXdr } = await StellarWalletsKit.signTransaction(prepared.toXDR(), {
    networkPassphrase: NETWORK_PASSPHRASE,
    address: sourceAddress,
  });

  const signedTx = TransactionBuilder.fromXDR(signedTxXdr, NETWORK_PASSPHRASE) as Transaction;
  const sendResult = await server.sendTransaction(signedTx);

  if (sendResult.status === "ERROR") {
    throw new Error(`Transaction rejected by network: ${sendResult.hash}`);
  }

  const final = await server.pollTransaction(sendResult.hash);

  return {
    status: final.status === rpc.Api.GetTransactionStatus.SUCCESS ? "SUCCESS" : "FAILED",
    hash: sendResult.hash,
  };
}

/**
 * Runs a read-only contract simulation (no signing, no submission) — used for
 * simple accessor methods like health()/version() that don't mutate state.
 */
export async function simulateContractCall(
  rpcUrl: string,
  contractId: string,
  sourceAddress: string,
  method: string,
  args: xdr.ScVal[] = []
) {
  const server = new rpc.Server(rpcUrl);
  const account = await server.getAccount(sourceAddress);
  const contract = new Contract(contractId);

  const tx = new TransactionBuilder(account, {
    fee: BASE_FEE,
    networkPassphrase: NETWORK_PASSPHRASE,
  })
    .addOperation(contract.call(method, ...args))
    .setTimeout(30)
    .build();

  const simulated = await server.simulateTransaction(tx);
  if (rpc.Api.isSimulationError(simulated)) {
    throw new Error(simulated.error);
  }
  return simulated;
}

/**
 * Simulates a state-changing contract call and returns a preview describing
 * whether it would succeed, the estimated fee, and (on failure) the revert
 * reason. Callers must surface this preview and require explicit confirmation
 * before invoking `invokeContract`.
 */
export async function previewContractCall(
  rpcUrl: string,
  contractId: string,
  sourceAddress: string,
  method: string,
  args: xdr.ScVal[] = []
): Promise<ContractCallPreview> {
  try {
    const simulated = await simulateContractCall(
      rpcUrl,
      contractId,
      sourceAddress,
      method,
      args
    );

    const minResourceFee = (simulated as { minResourceFee?: string }).minResourceFee;
    const estimatedFee = minResourceFee
      ? (BigInt(minResourceFee) + BigInt(BASE_FEE)).toString()
      : BASE_FEE;

    return {
      ok: true,
      method,
      estimatedFee,
      simulation: simulated,
    };
  } catch (error) {
    return {
      ok: false,
      method,
      estimatedFee: BASE_FEE,
      revertReason: error instanceof Error ? error.message : String(error),
    };
  }
}
