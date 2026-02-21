import { createHash } from 'crypto';
import bs58 from 'bs58';
import { grailService } from './index';
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
 * Ensure a GRAIL user exists for the given Cloak user.
 * Creates one if it doesn't exist yet.
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
  console.log(`GRAIL user created: ${createResult.userId}`);

  // If the creation returns a transaction, sign and submit it
  if (createResult.transaction?.serializedTx) {
    console.log('Signing user creation transaction...');
    const signedTx = grailService.signTransaction(createResult.transaction.serializedTx, 'legacy');
    const submitResult = await grailService.submitTransaction(signedTx);
    console.log(`User creation tx submitted: ${submitResult.txId}`);
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
