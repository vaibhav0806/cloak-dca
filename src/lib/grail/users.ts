import { createHash } from 'crypto';
import bs58 from 'bs58';
import { grailService } from './index';
import { getDevnetConnection } from '@/lib/solana/connection';
import { confirmTransactionPolling } from '@/lib/solana/confirm';
import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * Derive a KYC hash from a wallet address per GRAIL docs:
 * SHA-256(walletAddress) -> base58 encode
 */
function deriveKycHash(walletAddress: string): string {
  const hash = createHash('sha256').update(walletAddress).digest();
  return bs58.encode(hash);
}

/**
 * Ensure a GRAIL user exists for the given Cloak user.
 * Creates one if it doesn't exist yet, and waits for on-chain PDA initialization.
 *
 * IMPORTANT: sessionWalletAddress must be the session wallet public key, because:
 * - The session keypair signs purchase transactions
 * - GRAIL program validates signer matches registered user wallet
 * - On devnet, GRAIL auto-mints 1M USDC to the userWalletAddress on creation
 *
 * If the user has a stale GRAIL user ID registered with a different wallet
 * (e.g. from old partner-purchase flow or session derivation bump),
 * we clear it and create a new one with the correct session wallet.
 *
 * Returns the grail_user_id.
 */
export async function ensureGrailUser(
  cloakUserId: string,
  sessionWalletAddress: string,
  supabase: SupabaseClient
): Promise<string> {
  // Check if user already has a GRAIL user ID
  const { data: user, error } = await supabase
    .from('users')
    .select('grail_user_id, grail_user_pda, grail_registered_wallet')
    .eq('id', cloakUserId)
    .single();

  if (error) {
    throw new Error(`Failed to fetch user: ${error.message}`);
  }

  if (user?.grail_user_id) {
    // Validate that the registered wallet matches the current session wallet
    if (user.grail_registered_wallet === sessionWalletAddress) {
      console.log(`GRAIL user already exists: ${user.grail_user_id}`);
      return user.grail_user_id;
    }

    // Wallet mismatch — stale GRAIL user from old flow or session derivation change
    console.warn(
      `GRAIL user ${user.grail_user_id} was registered with ${user.grail_registered_wallet}, ` +
      `but current session wallet is ${sessionWalletAddress}. Re-creating GRAIL user.`
    );

    // Clear stale GRAIL user data
    await supabase
      .from('users')
      .update({ grail_user_id: null, grail_user_pda: null, grail_registered_wallet: null })
      .eq('id', cloakUserId);
  }

  // Create new GRAIL user with session wallet as userWalletAddress
  console.log(`Creating GRAIL user for session wallet ${sessionWalletAddress}`);
  const kycHash = deriveKycHash(sessionWalletAddress);

  const createResult = await grailService.createUser(kycHash, sessionWalletAddress);
  console.log(`GRAIL user created: ${createResult.userId}, PDA: ${createResult.userPda}`);

  // Sign and submit the on-chain initialization transaction
  if (createResult.transaction?.serializedTx) {
    console.log('Signing user creation transaction...');
    const signedTx = grailService.signTransaction(createResult.transaction.serializedTx, 'legacy');

    console.log('Submitting init tx to GRAIL...');
    const submitResult = await grailService.submitTransaction(signedTx);
    console.log(`Init tx submitted: ${submitResult.txId}, status: ${submitResult.status}`);

    // Wait for on-chain confirmation before proceeding
    if (submitResult.txId) {
      const connection = getDevnetConnection();
      console.log('Waiting for on-chain confirmation...');
      await confirmTransactionPolling(connection, submitResult.txId, 60, 500);
      console.log('User PDA initialized on-chain');
    }
  } else {
    console.warn('No init transaction returned — user may not be initialized on-chain');
  }

  // Store GRAIL user ID + registered wallet in DB
  const { error: updateError } = await supabase
    .from('users')
    .update({
      grail_user_id: createResult.userId,
      grail_user_pda: createResult.userPda,
      grail_registered_wallet: sessionWalletAddress,
    })
    .eq('id', cloakUserId);

  if (updateError) {
    throw new Error(`Failed to store GRAIL user ID: ${updateError.message}`);
  }

  return createResult.userId;
}
