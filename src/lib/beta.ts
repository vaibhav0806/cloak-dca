import { createServiceClient } from '@/lib/supabase/server';

/**
 * Check if a wallet address has been approved for beta access.
 * Checks both the users table flag and the beta_codes table for a redeemed code.
 */
export async function isBetaApproved(walletAddress: string): Promise<boolean> {
  const supabase = createServiceClient();

  // Check the users table first
  const { data: user } = await supabase
    .from('users')
    .select('beta_approved')
    .eq('wallet_address', walletAddress)
    .single();

  if (user?.beta_approved === true) {
    return true;
  }

  // Fallback: check if a code was redeemed for this wallet
  const { data: betaCode } = await supabase
    .from('beta_codes')
    .select('redeemed')
    .eq('wallet_address', walletAddress)
    .eq('redeemed', true)
    .single();

  if (betaCode) {
    // Sync the users table so future checks are fast
    await supabase
      .from('users')
      .upsert(
        { wallet_address: walletAddress, beta_approved: true },
        { onConflict: 'wallet_address', ignoreDuplicates: false }
      );
    return true;
  }

  return false;
}
