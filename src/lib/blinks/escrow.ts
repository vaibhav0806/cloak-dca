import { Keypair, PublicKey } from '@solana/web3.js';

let cachedKeypair: Keypair | null = null;

export function getEscrowKeypair(): Keypair {
  if (cachedKeypair) return cachedKeypair;

  const base64 = process.env.BLINK_ESCROW_KEYPAIR_BASE64;
  if (!base64) {
    throw new Error('BLINK_ESCROW_KEYPAIR_BASE64 not configured');
  }

  cachedKeypair = Keypair.fromSecretKey(Buffer.from(base64, 'base64'));
  return cachedKeypair;
}

export function getEscrowPublicKey(): PublicKey {
  return getEscrowKeypair().publicKey;
}
