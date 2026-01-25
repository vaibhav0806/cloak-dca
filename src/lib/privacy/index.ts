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

// LocalStorage key prefix for session signatures
const SESSION_STORAGE_KEY_PREFIX = 'cloak_session_';

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
 * Get cached session signature from localStorage
 */
function getCachedSessionSignature(walletAddress: string): Uint8Array | null {
  if (typeof window === 'undefined') return null;
  try {
    const cached = localStorage.getItem(`${SESSION_STORAGE_KEY_PREFIX}${walletAddress}`);
    if (cached) {
      return new Uint8Array(Buffer.from(cached, 'base64'));
    }
  } catch (e) {
    console.warn('Failed to read session from localStorage:', e);
  }
  return null;
}

/**
 * Cache session signature in localStorage
 */
function cacheSessionSignature(walletAddress: string, signature: Uint8Array): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(
      `${SESSION_STORAGE_KEY_PREFIX}${walletAddress}`,
      Buffer.from(signature).toString('base64')
    );
  } catch (e) {
    console.warn('Failed to cache session in localStorage:', e);
  }
}

/**
 * Clear cached session signature from localStorage
 */
function clearCachedSessionSignature(walletAddress: string): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(`${SESSION_STORAGE_KEY_PREFIX}${walletAddress}`);
  } catch (e) {
    console.warn('Failed to clear session from localStorage:', e);
  }
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
   * Fetch session keypair from database
   */
  private async fetchSessionFromDatabase(walletAddress: string): Promise<Keypair | null> {
    try {
      const response = await fetch('/api/session', {
        method: 'GET',
        headers: {
          'x-wallet-address': walletAddress,
        },
      });

      if (response.ok) {
        const data = await response.json();
        if (data.sessionKeypair) {
          // Browser-compatible base64 decoding
          const binaryString = atob(data.sessionKeypair);
          const secretKey = new Uint8Array(binaryString.length);
          for (let i = 0; i < binaryString.length; i++) {
            secretKey[i] = binaryString.charCodeAt(i);
          }
          return Keypair.fromSecretKey(secretKey);
        }
      }
    } catch (error) {
      console.warn('Failed to fetch session from database:', error);
    }
    return null;
  }

  /**
   * Save session keypair to database
   */
  private async saveSessionToDatabase(walletAddress: string, keypair: Keypair): Promise<void> {
    try {
      // Browser-compatible base64 encoding
      const binaryString = String.fromCharCode(...keypair.secretKey);
      const sessionKeypairBase64 = btoa(binaryString);
      await fetch('/api/session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-wallet-address': walletAddress,
        },
        body: JSON.stringify({ sessionKeypairBase64 }),
      });
    } catch (error) {
      console.warn('Failed to save session to database:', error);
    }
  }

  /**
   * Get or create a session keypair for DCA operations
   * Priority: 1. In-memory cache, 2. Database, 3. localStorage, 4. New signature
   * Saves to database for cross-device consistency
   */
  async getSessionKeypair(): Promise<Keypair> {
    if (!this.config) {
      throw new Error('Client not initialized');
    }

    // Return cached in-memory keypair if available
    if (this.sessionKeypair) {
      return this.sessionKeypair;
    }

    const walletAddress = this.config.wallet.publicKey.toBase58();

    // If a request is already in progress, wait for it
    if (this.sessionKeypairPromise) {
      return this.sessionKeypairPromise;
    }

    // Start the request and store the promise
    this.sessionKeypairPromise = (async () => {
      // 1. Try to fetch from database (cross-device persistent)
      const dbKeypair = await this.fetchSessionFromDatabase(walletAddress);
      if (dbKeypair) {
        this.sessionKeypair = dbKeypair;
        // Also cache in localStorage for faster subsequent loads
        cacheSessionSignature(walletAddress, dbKeypair.secretKey);
        return dbKeypair;
      }

      // 2. Try to restore from localStorage (same-device cache)
      const cachedSignature = getCachedSessionSignature(walletAddress);
      if (cachedSignature) {
        // This is a legacy cache - migrate it to database
        this.sessionKeypair = deriveSessionKeypair(cachedSignature);
        await this.saveSessionToDatabase(walletAddress, this.sessionKeypair);
        return this.sessionKeypair;
      }

      // 3. No existing session - create new one from signature
      const message = new TextEncoder().encode(SESSION_KEYPAIR_MESSAGE);
      const signature = await this.config!.wallet.signMessage(message);

      this.sessionKeypair = deriveSessionKeypair(signature);

      // Save to database for cross-device access
      await this.saveSessionToDatabase(walletAddress, this.sessionKeypair);

      // Also cache in localStorage
      cacheSessionSignature(walletAddress, signature);

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
   * @param depositAll - If true, deposit entire session wallet balance (not just the specified amount)
   */
  async deposit(tokenMint: string, amount: number, depositAll = false): Promise<{ signature: string }> {
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
        depositAll,
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
   * Note: We don't clear localStorage cache by default so user doesn't have to sign again
   */
  reset() {
    this.config = null;
    this.privacyCashSignature = null;
    this.sessionKeypair = null;
    this.sessionKeypairPromise = null;
  }

  /**
   * Fully logout - clears localStorage cache too
   * Use this when user explicitly wants to disconnect and clear all data
   */
  fullLogout(walletAddress: string) {
    this.reset();
    clearCachedSessionSignature(walletAddress);
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
