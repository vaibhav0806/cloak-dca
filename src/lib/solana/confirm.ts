import type { Connection } from '@solana/web3.js';

/**
 * Confirm a transaction using polling instead of WebSocket subscriptions.
 * Works reliably in serverless environments.
 */
export async function confirmTransactionPolling(
  connection: Connection,
  signature: string,
  maxRetries = 30,
  retryDelay = 1000
): Promise<boolean> {
  for (let i = 0; i < maxRetries; i++) {
    const status = await connection.getSignatureStatus(signature);
    if (status?.value?.confirmationStatus === 'confirmed' ||
        status?.value?.confirmationStatus === 'finalized') {
      return true;
    }
    if (status?.value?.err) {
      throw new Error(`Transaction failed: ${JSON.stringify(status.value.err)}`);
    }
    await new Promise(resolve => setTimeout(resolve, retryDelay));
  }
  throw new Error('Transaction confirmation timeout');
}
