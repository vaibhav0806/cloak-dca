import { Keypair, VersionedTransaction } from '@solana/web3.js';
import type { SupabaseClient } from '@supabase/supabase-js';
import { grailService } from './index';
import { ensureGrailUser } from './users';
import { getDevnetConnection } from '@/lib/solana/connection';
import { confirmTransactionPolling } from '@/lib/solana/confirm';

interface GrailPurchaseResult {
  txId: string;
  goldAmount: number;
  goldPrice: number;
}

/**
 * Execute a GRAIL gold purchase via user purchase flow.
 *
 * Flow:
 * 1. Get gold price + estimate
 * 2. Ensure GRAIL user exists (uses session wallet — triggers devnet USDC airdrop on first creation)
 * 3. purchaseGoldForUser() — gold is owned by user's on-chain PDA
 * 4. Deserialize VersionedTransaction
 * 5. Sign with BOTH sessionKeypair (user/fee payer) AND execKeypair (co-signer)
 * 6. Submit to chain, confirm via polling
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

  // Step 2: Ensure GRAIL user exists (session wallet = userWalletAddress)
  const sessionWalletPubkey = sessionKeypair.publicKey.toBase58();
  const grailUserId = await ensureGrailUser(cloakUserId, sessionWalletPubkey, supabase);
  console.log(`GRAIL user ID: ${grailUserId}`);

  // Step 3: Request user purchase transaction from GRAIL
  const purchaseResult = await grailService.purchaseGoldForUser(
    grailUserId,
    goldAmount,
    maxUsdcAmount
  );

  // Step 4: Deserialize the transaction
  const txBuffer = Buffer.from(purchaseResult.transaction.serializedTx, 'base64');
  const versionedTx = VersionedTransaction.deserialize(txBuffer);

  // Step 5: Sign with BOTH session keypair (user/fee payer) AND executive authority (co-signer)
  const execKeypair = grailService.getExecutiveKeypairPublic();
  versionedTx.sign([sessionKeypair, execKeypair]);

  // Step 6: Submit and confirm
  const txId = await connection.sendTransaction(versionedTx, {
    skipPreflight: true,
    maxRetries: 5,
  });
  console.log(`Gold purchase tx: ${txId}`);

  await confirmTransactionPolling(connection, txId, 60, 500);
  console.log(`Gold purchase confirmed: ${txId}`);

  return {
    txId,
    goldAmount: purchaseResult.goldAmount ?? purchaseResult.estimatedGoldAmount ?? goldAmount,
    goldPrice: goldPricePerOunce,
  };
}
