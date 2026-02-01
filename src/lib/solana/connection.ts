import { Connection, clusterApiUrl } from '@solana/web3.js';

// Helius primary, Quicknode fallback
const RPC_URL =
  process.env.NEXT_PUBLIC_HELIUS_RPC_URL ||
  process.env.NEXT_PUBLIC_QUICKNODE_RPC_URL ||
  clusterApiUrl('devnet');

let connection: Connection | null = null;

export function getConnection(): Connection {
  if (!connection) {
    connection = new Connection(RPC_URL, {
      commitment: 'confirmed',
      confirmTransactionInitialTimeout: 60000,
    });
  }
  return connection;
}

export function getExplorerUrl(signature: string, cluster: 'mainnet-beta' | 'devnet' = 'devnet'): string {
  return `https://explorer.solana.com/tx/${signature}?cluster=${cluster}`;
}

export function getAddressExplorerUrl(address: string, cluster: 'mainnet-beta' | 'devnet' = 'devnet'): string {
  return `https://explorer.solana.com/address/${address}?cluster=${cluster}`;
}
