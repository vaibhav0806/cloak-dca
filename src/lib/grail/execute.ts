import { Keypair, PublicKey, Transaction } from '@solana/web3.js';
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
import { ensureGrailUser } from './users';
import { USDC_MINT } from '@/lib/solana/constants';
import { getDevnetConnection } from '@/lib/solana/connection';

interface GrailPurchaseResult {
  txId: string;
  goldAmount: number;
  goldPrice: number;
}

/**
 * Execute a GRAIL gold purchase for a user.
 *
 * Flow:
 * 1. Ensure GRAIL user exists
 * 2. Get current gold price
 * 3. Calculate gold amount from USDC
 * 4. Estimate buy to get precise cost
 * 5. Transfer USDC from session wallet → central vault
 * 6. Purchase gold for user via GRAIL
 * 7. Sign and submit transaction
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

  // Step 1: Ensure GRAIL user exists
  const grailUserId = await ensureGrailUser(cloakUserId, walletAddress, supabase);
  console.log(`Using GRAIL user: ${grailUserId}`);

  // Step 2: Get current gold price
  const priceData = await grailService.getGoldPrice();
  const goldPricePerOunce = priceData.price;
  console.log(`Current gold price: $${goldPricePerOunce}/oz`);

  // Step 3: Calculate gold amount
  const goldAmount = usdcAmount / goldPricePerOunce;
  console.log(`Purchasing ~${goldAmount.toFixed(6)} oz of gold for $${usdcAmount}`);

  // Step 4: Get precise estimate
  const estimate = await grailService.estimateBuy(goldAmount);
  const maxUsdcAmount = estimate.estimatedUsdc * 1.05; // 5% slippage buffer
  console.log(`Estimated cost: $${estimate.estimatedUsdc}, max: $${maxUsdcAmount}`);

  // Step 5: Transfer USDC from session wallet → central vault
  const centralVault = new PublicKey(GRAIL_CONFIG.centralVaultWallet);
  const usdcMint = new PublicKey(USDC_MINT);
  const sourceAta = await getAssociatedTokenAddress(usdcMint, sessionKeypair.publicKey);
  const destAta = await getAssociatedTokenAddress(usdcMint, centralVault);

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

  const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash();
  transferTx.recentBlockhash = blockhash;
  transferTx.feePayer = sessionKeypair.publicKey;
  transferTx.sign(sessionKeypair);

  const transferSig = await connection.sendRawTransaction(transferTx.serialize(), {
    skipPreflight: true,
    maxRetries: 5,
  });
  console.log(`USDC transfer to vault: ${transferSig}`);

  await connection.confirmTransaction(
    { signature: transferSig, blockhash, lastValidBlockHeight },
    'confirmed'
  );
  console.log('USDC transfer confirmed');

  // Step 6: Purchase gold for user
  const purchaseResult = await grailService.purchaseGoldForUser(
    grailUserId,
    goldAmount,
    maxUsdcAmount
  );

  // Step 7: Sign and submit
  const signedTx = grailService.signTransaction(purchaseResult.transaction, 'versioned');
  const submitResult = await grailService.submitTransaction(signedTx);
  console.log(`Gold purchase tx: ${submitResult.txId}`);

  return {
    txId: submitResult.txId,
    goldAmount: purchaseResult.estimatedGoldAmount,
    goldPrice: goldPricePerOunce,
  };
}
