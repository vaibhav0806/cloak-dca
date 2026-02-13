import { createServiceClient } from '@/lib/supabase/server';

/**
 * Check if a wallet address has been approved for beta access.
 * Used by API routes to enforce server-side beta gating.
 */
export async function isBetaApproved(walletAddress: string): Promise<boolean> {
  const supabase = createServiceClient();

  const { data, error } = await supabase
    .from('users')
    .select('beta_approved')
    .eq('wallet_address', walletAddress)
    .single();

  if (error || !data) {
    return false;
  }

  return data.beta_approved === true;
}
