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
