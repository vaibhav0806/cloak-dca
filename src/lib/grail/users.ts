import { createHash } from 'crypto';
import { Connection } from '@solana/web3.js';
import bs58 from 'bs58';
import { grailService } from './index';
import { getDevnetConnection } from '@/lib/solana/connection';
import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * Derive a KYC hash from a wallet address per GRAIL docs:
 * SHA-256(walletAddress) → base58 encode
 */
function deriveKycHash(walletAddress: string): string {
  const hash = createHash('sha256').update(walletAddress).digest();
  return bs58.encode(hash);
}

/**
 * Wait for a transaction to confirm using polling.
 */
async function waitForConfirmation(
  connection: Connection,
  txId: string,
  maxRetries = 60,
  retryDelay = 500
): Promise<void> {
  for (let i = 0; i < maxRetries; i++) {
    const status = await connection.getSignatureStatus(txId);
    if (status?.value?.confirmationStatus === 'confirmed' ||
        status?.value?.confirmationStatus === 'finalized') {
      return;
    }
    if (status?.value?.err) {
      throw new Error(`Init tx failed on-chain: ${JSON.stringify(status.value.err)}`);
    }
    await new Promise(resolve => setTimeout(resolve, retryDelay));
  }
  throw new Error('Init tx confirmation timeout');
}

/**
 * Ensure a GRAIL user exists for the given Cloak user.
 * Creates one if it doesn't exist yet, and waits for on-chain PDA initialization.
 * Returns the grail_user_id.
 */
export async function ensureGrailUser(
  cloakUserId: string,
  walletAddress: string,
  supabase: SupabaseClient
): Promise<string> {
  // Check if user already has a GRAIL user ID
  const { data: user, error } = await supabase
    .from('users')
    .select('grail_user_id, grail_user_pda')
    .eq('id', cloakUserId)
    .single();

  if (error) {
    throw new Error(`Failed to fetch user: ${error.message}`);
  }

  if (user?.grail_user_id) {
    console.log(`GRAIL user already exists: ${user.grail_user_id}`);
    return user.grail_user_id;
  }

  // Create new GRAIL user
  console.log(`Creating GRAIL user for wallet ${walletAddress}`);
  const kycHash = deriveKycHash(walletAddress);

  const createResult = await grailService.createUser(kycHash, walletAddress);
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
      await waitForConfirmation(connection, submitResult.txId);
      console.log('User PDA initialized on-chain');
    }
  } else {
    console.warn('No init transaction returned — user may not be initialized on-chain');
  }

  // Store GRAIL user ID in DB
  const { error: updateError } = await supabase
    .from('users')
    .update({
      grail_user_id: createResult.userId,
      grail_user_pda: createResult.userPda,
    })
    .eq('id', cloakUserId);

  if (updateError) {
    throw new Error(`Failed to store GRAIL user ID: ${updateError.message}`);
  }

  return createResult.userId;
}
