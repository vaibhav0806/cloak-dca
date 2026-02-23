/**
 * Check if a wallet address has been approved for beta access.
 * Beta gate disabled on devnet — all wallets are approved.
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function isBetaApproved(walletAddress: string): Promise<boolean> {
  return true;
}
