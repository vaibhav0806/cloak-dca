import { createServiceClient } from '@/lib/supabase/server';

/**
 * Toggle beta gating on/off. When false, all users bypass the beta gate.
 * Set to true to re-enable invite-code gating.
 */
export const BETA_GATING_ENABLED = false;

/**
 * Check if a wallet address has been approved for beta access.
 * Uses beta_codes table as the single source of truth.
 */
export async function isBetaApproved(walletAddress: string): Promise<boolean> {
  if (!BETA_GATING_ENABLED) return true;

  const supabase = createServiceClient();

  const { data, error } = await supabase
    .from('beta_codes')
    .select('redeemed')
    .eq('wallet_address', walletAddress)
    .eq('redeemed', true)
    .maybeSingle();

  if (error) {
    console.error('[Beta Check] error:', error);
    return false;
  }

  return !!data;
}
