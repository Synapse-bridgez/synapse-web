import {
  BASE_FEE,
  Contract,
  FeeBumpTransaction,
  TransactionBuilder,
  rpc,
  xdr,
  type Transaction,
} from "@stellar/stellar-sdk";
import { StellarWalletsKit } from "@/lib/wallet/kit";

export { addressArg, stringArg, structArg } from "./args";

const NETWORK_PASSPHRASE = "Test SDF Network ; September 2015";

/**
 * Default number of ledgers (~5s each) a submission may stay pending before the
 * UI offers the "speed up" fee-bump action. Configurable per call site.
 */
export const DEFAULT_FEE_BUMP_THRESHOLD_LEDGERS = 12;

/**
 * Multiplier applied to the simulated resource fee when building a fee-bump,
 * so the replacement transaction outbids the original during congestion.
 */
const FEE_BUMP_MULTIPLIER = 2;

export interface ContractCallResult {
  status: "SUCCESS" | "FAILED";
  hash: string;
}

/**
 * Estimated network fee (in stroops) for a contract invocation, derived from
 * the resource usage reported by `simulateContractCall`. Shown in the
 * simulation-preview flow before every signed submission.
 */
export interface FeeEstimate {
  /** Total estimated fee in stroops (inclusion fee + simulated resource fee). */
  totalStroops: number;
  /** Inclusion fee component in stroops. */
  inclusionStroops: number;
  /** Simulated resource fee component in stroops. */
  resourceStroops: number;
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
 * Estimates the network fee for a contract invocation from the resource usage
 * reported by `simulateContractCall`. Used by the simulation-preview flow to
 * surface the cost before the user signs.
 */
export async function estimateContractCallFee(
  rpcUrl: string,
  contractId: string,
  sourceAddress: string,
  method: string,
  args: xdr.ScVal[] = []
): Promise<FeeEstimate> {
  const simulated = await simulateContractCall(
    rpcUrl,
    contractId,
    sourceAddress,
    method,
    args
  );

  const inclusionStroops = Number(BASE_FEE);
  const resourceStroops = Number(simulated.minResourceFee ?? 0);

  return {
    totalStroops: inclusionStroops + resourceStroops,
    inclusionStroops,
    resourceStroops,
  };
}

/**
 * Builds a correctly-formed fee-bump transaction that replaces a stuck
 * submission. The fee-bump is signed by the fee source (the connected wallet)
 * and must be explicitly triggered by the user — never automatically.
 *
 * If the original transaction has already confirmed, the caller should treat
 * the resulting submission error as a benign stale-state condition rather than
 * a bug (see `isAlreadyConfirmedError`).
 */
export async function buildFeeBumpTransaction(
  rpcUrl: string,
  innerTxXdr: string,
  feeSourceAddress: string,
  baseFeeStroops: number = BASE_FEE
): Promise<FeeBumpTransaction> {
  const server = new rpc.Server(rpcUrl);
  const innerTx = TransactionBuilder.fromXDR(innerTxXdr, NETWORK_PASSPHRASE) as Transaction;

  const bumpedFee = Math.max(
    Number(baseFeeStroops) * FEE_BUMP_MULTIPLIER,
    Number(innerTx.fee) * FEE_BUMP_MULTIPLIER
  );

  const feeBump = TransactionBuilder.buildFeeBumpTransaction(
    feeSourceAddress,
    bumpedFee.toString(),
    innerTx,
    NETWORK_PASSPHRASE
  );

  // Ensure the fee source account exists on the network before signing.
  await server.getAccount(feeSourceAddress);

  return feeBump;
}

/**
 * Signs and submits a fee-bump transaction built by `buildFeeBumpTransaction`.
 * Requires an explicit user signature via the connected wallet.
 */
export async function submitFeeBumpTransaction(
  rpcUrl: string,
  feeBump: FeeBumpTransaction,
  feeSourceAddress: string
): Promise<ContractCallResult> {
  const server = new rpc.Server(rpcUrl);

  const { signedTxXdr } = await StellarWalletsKit.signTransaction(feeBump.toXDR(), {
    networkPassphrase: NETWORK_PASSPHRASE,
    address: feeSourceAddress,
  });

  const signedTx = TransactionBuilder.fromXDR(
    signedTxXdr,
    NETWORK_PASSPHRASE
  ) as FeeBumpTransaction;

  const sendResult = await server.sendTransaction(signedTx);

  if (sendResult.status === "ERROR") {
    throw new Error(`Fee-bump rejected by network: ${sendResult.hash}`);
  }

  const final = await server.pollTransaction(sendResult.hash);

  return {
    status: final.status === rpc.Api.GetTransactionStatus.SUCCESS ? "SUCCESS" : "FAILED",
    hash: sendResult.hash,
  };
}

/**
 * Returns true when a fee-bump submission failed because the original
 * transaction already confirmed in the interim. Callers should surface this as
 * an informational "already confirmed" state, not as a bug.
 */
export function isAlreadyConfirmedError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  return /already (confirmed|included|applied)|tx_bad_seq|tx_too_late/i.test(message);
}
