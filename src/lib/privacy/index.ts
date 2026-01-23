/**
 * Privacy.cash SDK Integration - Client Side
 *
 * This module provides client-side types and utilities for privacy operations.
 * The actual Privacy Cash SDK is only used on the server side (API routes)
 * because it requires Node.js modules (fs, node-localstorage).
 */

import { Connection, Keypair, PublicKey, VersionedTransaction } from '@solana/web3.js';
import type { TokenInfo, ShieldedBalance } from '@/types';

// Message used by Privacy Cash for deriving encryption keys
export const PRIVACY_CASH_SIGN_MESSAGE = 'Privacy Money account sign in';

// Session keypair derivation message
export const SESSION_KEYPAIR_MESSAGE = 'Cloak Session Key Derivation';

/**
 * Derives a deterministic session keypair from a wallet signature
 * This keypair is used for DCA operations without exposing the main wallet
 */
export function deriveSessionKeypair(signature: Uint8Array): Keypair {
  // Use first 32 bytes of signature as seed for session keypair
  const seed = signature.slice(0, 32);
  return Keypair.fromSeed(seed);
}

/**
 * Client-side privacy operations configuration
 */
export interface ClientPrivacyConfig {
  connection: Connection;
  wallet: {
    publicKey: PublicKey;
    signTransaction: <T extends VersionedTransaction>(tx: T) => Promise<T>;
    signAllTransactions: <T extends VersionedTransaction>(txs: T[]) => Promise<T[]>;
    signMessage: (message: Uint8Array) => Promise<Uint8Array>;
  };
}

/**
 * Client-side privacy client
 * Handles wallet signing and communicates with server APIs
 */
class ClientPrivacyClient {
  private config: ClientPrivacyConfig | null = null;
  private privacyCashSignature: Uint8Array | null = null;
  private sessionKeypair: Keypair | null = null;

  initialize(config: ClientPrivacyConfig) {
    this.config = config;
  }

  isInitialized(): boolean {
    return this.config !== null;
  }

  getConfig(): ClientPrivacyConfig | null {
    return this.config;
  }

  /**
   * Get the Privacy Cash signature from user
   * This signature is used to derive encryption keys for accessing shielded balances
   */
  async getPrivacyCashSignature(): Promise<Uint8Array> {
    if (!this.config) {
      throw new Error('Client not initialized');
    }

    if (this.privacyCashSignature) {
      return this.privacyCashSignature;
    }

    const message = new TextEncoder().encode(PRIVACY_CASH_SIGN_MESSAGE);
    this.privacyCashSignature = await this.config.wallet.signMessage(message);
    return this.privacyCashSignature;
  }

  private sessionKeypairPromise: Promise<Keypair> | null = null;

  /**
   * Get or create a session keypair for DCA operations
   * Uses promise-based locking to prevent concurrent signature requests
   */
  async getSessionKeypair(): Promise<Keypair> {
    if (!this.config) {
      throw new Error('Client not initialized');
    }

    if (this.sessionKeypair) {
      return this.sessionKeypair;
    }

    // If a request is already in progress, wait for it
    if (this.sessionKeypairPromise) {
      return this.sessionKeypairPromise;
    }

    // Start the request and store the promise
    this.sessionKeypairPromise = (async () => {
      const message = new TextEncoder().encode(SESSION_KEYPAIR_MESSAGE);
      const signature = await this.config!.wallet.signMessage(message);
      this.sessionKeypair = deriveSessionKeypair(signature);
      return this.sessionKeypair;
    })();

    try {
      return await this.sessionKeypairPromise;
    } finally {
      this.sessionKeypairPromise = null;
    }
  }

  /**
   * Get shielded balances via API
   */
  async getAllShieldedBalances(tokens: TokenInfo[]): Promise<ShieldedBalance[]> {
    if (!this.config) {
      throw new Error('Client not initialized');
    }

    try {
      // Get session keypair (this prompts user to sign if needed)
      const sessionKeypair = await this.getSessionKeypair();
      const sessionKeypairBase64 = Buffer.from(sessionKeypair.secretKey).toString('base64');

      const response = await fetch('/api/privacy/balance', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-wallet-address': this.config.wallet.publicKey.toBase58(),
        },
        body: JSON.stringify({
          sessionKeypairBase64,
          tokenMints: tokens.map(t => t.mint),
        }),
      });

      if (response.ok) {
        const data = await response.json();
        return data.balances || tokens.map(token => ({ token, amount: 0 }));
      }

      console.error('Failed to fetch balances');
      return tokens.map(token => ({ token, amount: 0 }));
    } catch (error) {
      console.error('Error fetching shielded balances:', error);
      return tokens.map(token => ({ token, amount: 0 }));
    }
  }

  /**
   * Deposit tokens via API
   */
  async deposit(tokenMint: string, amount: number): Promise<{ signature: string }> {
    if (!this.config) {
      throw new Error('Client not initialized');
    }

    const sessionKeypair = await this.getSessionKeypair();
    const sessionKeypairBase64 = Buffer.from(sessionKeypair.secretKey).toString('base64');

    const response = await fetch('/api/privacy/deposit', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-wallet-address': this.config.wallet.publicKey.toBase58(),
      },
      body: JSON.stringify({
        sessionKeypairBase64,
        tokenMint,
        amount,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Deposit failed');
    }

    return await response.json();
  }

  /**
   * Withdraw tokens via API
   */
  async withdraw(tokenMint: string, amount: number, recipient: string): Promise<{ signature: string }> {
    if (!this.config) {
      throw new Error('Client not initialized');
    }

    const sessionKeypair = await this.getSessionKeypair();
    const sessionKeypairBase64 = Buffer.from(sessionKeypair.secretKey).toString('base64');

    const response = await fetch('/api/privacy/withdraw', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-wallet-address': this.config.wallet.publicKey.toBase58(),
      },
      body: JSON.stringify({
        sessionKeypairBase64,
        tokenMint,
        amount,
        recipient,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Withdrawal failed');
    }

    return await response.json();
  }

  /**
   * Get the session keypair's public key
   */
  async getSessionPublicKey(): Promise<string> {
    const keypair = await this.getSessionKeypair();
    return keypair.publicKey.toBase58();
  }

  /**
   * Export session keypair as base64 string
   */
  async exportSessionKeypair(): Promise<string> {
    const keypair = await this.getSessionKeypair();
    return Buffer.from(keypair.secretKey).toString('base64');
  }

  /**
   * Reset the client state (call when wallet disconnects)
   */
  reset() {
    this.config = null;
    this.privacyCashSignature = null;
    this.sessionKeypair = null;
    this.sessionKeypairPromise = null;
  }
}

// Singleton instance for client-side use
export const privacyClient = new ClientPrivacyClient();

export function initializePrivacyClient(config: ClientPrivacyConfig) {
  privacyClient.initialize(config);
}

export function resetPrivacyClient() {
  privacyClient.reset();
}
