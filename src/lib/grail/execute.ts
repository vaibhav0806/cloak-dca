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
 * Execute a GRAIL gold purchase via partner purchase flow.
 *
 * Devnet: Partner purchase uses the vault's pre-funded GRAIL USDC.
 * The session wallet does NOT need GRAIL USDC — only the vault does.
 * Gold is tracked per-user in Cloak's DB (on-chain attribution via
 * user purchases will be enabled on mainnet once real USDC is available).
 *
 * Flow:
 * 1. Get gold price + estimate
 * 2. Ensure GRAIL user exists (for identity tracking)
 * 3. Partner purchase (vault's GRAIL USDC → gold)
 * 4. Sign with executive authority
 * 5. Submit to chain, confirm via polling
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

  // Step 2: Ensure GRAIL user exists (for identity tracking, future user purchases)
  const sessionWalletPubkey = sessionKeypair.publicKey.toBase58();
  const grailUserId = await ensureGrailUser(cloakUserId, sessionWalletPubkey, supabase);
  console.log(`GRAIL user ID: ${grailUserId}`);

  // Step 3: Partner purchase — vault's GRAIL USDC is used, no user USDC needed
  const purchaseResult = await grailService.purchaseGoldForPartner(
    goldAmount,
    maxUsdcAmount
  );

  // Step 4: Deserialize and sign with executive authority
  const txBuffer = Buffer.from(purchaseResult.transaction.serializedTx, 'base64');
  const versionedTx = VersionedTransaction.deserialize(txBuffer);
  const execKeypair = grailService.getExecutiveKeypairPublic();
  versionedTx.sign([execKeypair]);

  // Step 5: Submit and confirm
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
