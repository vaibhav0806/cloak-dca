import { Keypair, PublicKey, Transaction, Connection } from '@solana/web3.js';
import {
  getAssociatedTokenAddress,
  createTransferInstruction,
  createAssociatedTokenAccountInstruction,
  getAccount,
  TokenAccountNotFoundError,
} from '@solana/spl-token';
import type { SupabaseClient } from '@supabase/supabase-js';
import { grailService } from './index';
import { GRAIL_CONFIG } from './config';
import { USDC_MINT } from '@/lib/solana/constants';
import { getDevnetConnection } from '@/lib/solana/connection';

/**
 * Confirm a transaction using polling (no WebSocket needed).
 */
async function confirmTransactionPolling(
  connection: Connection,
  signature: string,
  maxRetries = 30,
  retryDelay = 1000
): Promise<boolean> {
  for (let i = 0; i < maxRetries; i++) {
    const status = await connection.getSignatureStatus(signature);
    if (status?.value?.confirmationStatus === 'confirmed' ||
        status?.value?.confirmationStatus === 'finalized') {
      return true;
    }
    if (status?.value?.err) {
      throw new Error(`Transaction failed: ${JSON.stringify(status.value.err)}`);
    }
    await new Promise(resolve => setTimeout(resolve, retryDelay));
  }
  throw new Error('Transaction confirmation timeout');
}

interface GrailPurchaseResult {
  txId: string;
  goldAmount: number;
  goldPrice: number;
}

/**
 * Execute a GRAIL gold purchase via partner purchase flow.
 *
 * Why partner purchase instead of user purchase:
 * GRAIL's devnet uses a different USDC mint than Circle's devnet faucet.
 * User purchases require GRAIL's USDC in the user wallet, which we can't obtain.
 * Partner purchases work because the vault was pre-funded with GRAIL's USDC.
 * On mainnet, both will use real USDC and user purchases will work directly.
 *
 * Flow:
 * 1. Get gold price + estimate
 * 2. Transfer USDC from session wallet → partner vault (locks user funds)
 * 3. Partner purchase (GRAIL deducts from vault, deposits gold to vault)
 * 4. Sign with executive authority and submit
 * 5. Gold attributed to user in our executions table
 */
export async function executeGrailPurchase({
  cloakUserId,
  walletAddress,
  usdcAmount,
  sessionKeypair,
  supabase,
}: {
  cloakUserId: string;
  walletAddress: string;
  usdcAmount: number; // in whole USDC (e.g. 10.0)
  sessionKeypair: Keypair;
  supabase: SupabaseClient;
}): Promise<GrailPurchaseResult> {
  const connection = getDevnetConnection();

  // Step 1: Get current gold price
  const priceData = await grailService.getGoldPrice();
  const goldPricePerOunce = priceData.price;
  console.log(`Current gold price: $${goldPricePerOunce}/oz`);

  // Calculate gold amount
  const goldAmount = usdcAmount / goldPricePerOunce;
  console.log(`Purchasing ~${goldAmount.toFixed(6)} oz of gold for $${usdcAmount}`);

  // Get precise estimate
  const estimate = await grailService.estimateBuy(goldAmount);
  const estimatedUsdc = estimate.estimatedUsdcAmount ?? estimate.estimatedUsdc;
  const maxUsdcAmount = estimatedUsdc * 1.05; // 5% slippage buffer
  console.log(`Estimated cost: $${estimatedUsdc}, max: $${maxUsdcAmount}`);

  // Step 2: Transfer USDC from session wallet → partner vault
  const centralVault = new PublicKey(GRAIL_CONFIG.centralVaultWallet);
  const usdcMint = new PublicKey(USDC_MINT);
  const sourceAta = await getAssociatedTokenAddress(usdcMint, sessionKeypair.publicKey);
  const destAta = await getAssociatedTokenAddress(usdcMint, centralVault, true);

  const transferTx = new Transaction();

  // Ensure destination ATA exists
  try {
    await getAccount(connection, destAta);
  } catch (err) {
    if (err instanceof TokenAccountNotFoundError) {
      transferTx.add(
        createAssociatedTokenAccountInstruction(
          sessionKeypair.publicKey,
          destAta,
          centralVault,
          usdcMint
        )
      );
    } else {
      throw err;
    }
  }

  const usdcBaseUnits = Math.floor(usdcAmount * 1e6);
  transferTx.add(
    createTransferInstruction(
      sourceAta,
      destAta,
      sessionKeypair.publicKey,
      usdcBaseUnits
    )
  );

  const { blockhash } = await connection.getLatestBlockhash();
  transferTx.recentBlockhash = blockhash;
  transferTx.feePayer = sessionKeypair.publicKey;
  transferTx.sign(sessionKeypair);

  const transferSig = await connection.sendRawTransaction(transferTx.serialize(), {
    skipPreflight: true,
    maxRetries: 5,
  });
  console.log(`USDC transfer to vault: ${transferSig}`);
  await confirmTransactionPolling(connection, transferSig, 60, 500);
  console.log('USDC transfer confirmed');

  // Step 3: Partner purchase (gold bought from vault's GRAIL USDC)
  const purchaseResult = await grailService.purchaseGoldForPartner(
    goldAmount,
    maxUsdcAmount
  );

  // Step 4: Sign with executive authority and submit
  const txBuffer = Buffer.from(purchaseResult.transaction.serializedTx, 'base64');
  const { VersionedTransaction } = await import('@solana/web3.js');
  const versionedTx = VersionedTransaction.deserialize(txBuffer);
  const execKeypair = grailService.getExecutiveKeypairPublic();
  versionedTx.sign([execKeypair]);

  const txId = await connection.sendTransaction(versionedTx, {
    skipPreflight: true,
    maxRetries: 5,
  });
  console.log(`Gold purchase tx: ${txId}`);

  await confirmTransactionPolling(connection, txId, 60, 500);
  console.log(`Gold purchase confirmed: ${txId}`);

  return {
    txId,
    goldAmount: purchaseResult.estimatedGoldAmount,
    goldPrice: goldPricePerOunce,
  };
}
