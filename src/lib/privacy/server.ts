/**
 * Privacy.cash SDK Integration - Server Side Only
 *
 * This module wraps the Privacy Cash SDK for server-side use.
 * All operations require the SDK to be properly initialized.
 *
 * See: https://github.com/Privacy-Cash/privacy-cash-sdk for setup
 */

import { Keypair, PublicKey } from '@solana/web3.js';
import { USDC_MINT, SOL_MINT } from '@/lib/solana/constants';

interface DepositResult {
  tx: string;
}

interface WithdrawResult {
  isPartial: boolean;
  tx: string;
  recipient: string;
  amount_in_lamports?: number;
  base_units?: number;
  fee_in_lamports?: number;
  fee_base_units?: number;
}

/**
 * Privacy Cash server-side client
 * Requires proper SDK initialization - no mock mode
 */
export class PrivacyCashServer {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private client: any = null;
  private keypair: Keypair;
  private rpcUrl: string;
  private initialized: boolean = false;

  constructor(rpcUrl: string, keypair: Keypair) {
    this.rpcUrl = rpcUrl;
    this.keypair = keypair;
  }

  /**
   * Initialize the Privacy Cash SDK
   * Throws error if initialization fails
   */
  async initialize(): Promise<void> {
    try {
      // Dynamic import to avoid bundling issues
      const { PrivacyCash } = await import('privacycash');

      // Pass secret key as Uint8Array to avoid Keypair class version mismatch
      // (SDK bundles its own @solana/web3.js, so instanceof checks fail)
      this.client = new PrivacyCash({
        RPC_url: this.rpcUrl,
        owner: this.keypair.secretKey,
        enableDebug: true, // Enable debug for better error messages
      });
      this.initialized = true;
      console.log('Privacy Cash SDK initialized successfully');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('Privacy Cash SDK initialization failed:', error);
      throw new Error(`Failed to initialize Privacy Cash SDK: ${errorMessage}. Ensure WASM files are properly configured.`);
    }
  }

  /**
   * Check if SDK is initialized
   */
  isInitialized(): boolean {
    return this.initialized;
  }

  /**
   * Ensure client is initialized before operations
   */
  private ensureInitialized(): void {
    if (!this.initialized || !this.client) {
      throw new Error('Privacy Cash SDK not initialized. Call initialize() first.');
    }
  }

  /**
   * Get shielded SOL balance in lamports
   */
  async getPrivateBalanceSOL(): Promise<number> {
    this.ensureInitialized();
    try {
      const result = await this.client.getPrivateBalance();
      return result.lamports || 0;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      throw new Error(`Failed to get private SOL balance: ${errorMessage}`);
    }
  }

  /**
   * Get shielded USDC balance in base units
   */
  async getPrivateBalanceUSDC(): Promise<number> {
    this.ensureInitialized();
    try {
      const result = await this.client.getPrivateBalanceUSDC();
      return result.base_units || 0;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      throw new Error(`Failed to get private USDC balance: ${errorMessage}`);
    }
  }

  /**
   * Get shielded balance for any SPL token in base units
   */
  async getPrivateBalanceSPL(mintAddress: string): Promise<number> {
    this.ensureInitialized();
    try {
      const result = await this.client.getPrivateBalanceSpl(mintAddress);
      return result.base_units || 0;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      throw new Error(`Failed to get private SPL balance for ${mintAddress}: ${errorMessage}`);
    }
  }

  /**
   * Deposit SOL to Privacy Cash (shield tokens)
   */
  async depositSOL(lamports: number): Promise<DepositResult> {
    this.ensureInitialized();
    if (lamports <= 0) {
      throw new Error('Deposit amount must be greater than 0');
    }
    try {
      const result = await this.client.deposit({ lamports });
      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      throw new Error(`Failed to deposit SOL: ${errorMessage}`);
    }
  }

  /**
   * Deposit USDC to Privacy Cash (shield tokens)
   */
  async depositUSDC(baseUnits: number): Promise<DepositResult> {
    this.ensureInitialized();
    if (baseUnits <= 0) {
      throw new Error('Deposit amount must be greater than 0');
    }
    try {
      console.log(`Attempting to deposit ${baseUnits} USDC base units from wallet: ${this.keypair.publicKey.toBase58()}`);
      const result = await this.client.depositUSDC({ base_units: baseUnits });
      console.log('Deposit USDC result:', result);
      return result;
    } catch (error) {
      console.error('Full deposit error:', error);
      // Try to extract more details from the error
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      const errorStack = error instanceof Error ? error.stack : '';
      console.error('Error stack:', errorStack);
      throw new Error(`Failed to deposit USDC: ${errorMessage}`);
    }
  }

  /**
   * Deposit any SPL token to Privacy Cash
   */
  async depositSPL(mintAddress: string, baseUnits: number): Promise<DepositResult> {
    this.ensureInitialized();
    if (baseUnits <= 0) {
      throw new Error('Deposit amount must be greater than 0');
    }
    if (!mintAddress) {
      throw new Error('Mint address is required');
    }
    try {
      const result = await this.client.depositSPL({
        mintAddress,
        base_units: baseUnits,
      });
      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      throw new Error(`Failed to deposit SPL token ${mintAddress}: ${errorMessage}`);
    }
  }

  /**
   * Withdraw SOL from Privacy Cash (unshield tokens)
   */
  async withdrawSOL(lamports: number, recipientAddress?: string): Promise<WithdrawResult> {
    this.ensureInitialized();
    if (lamports <= 0) {
      throw new Error('Withdrawal amount must be greater than 0');
    }
    try {
      const result = await this.client.withdraw({
        lamports,
        recipientAddress,
      });
      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      throw new Error(`Failed to withdraw SOL: ${errorMessage}`);
    }
  }

  /**
   * Withdraw USDC from Privacy Cash (unshield tokens)
   */
  async withdrawUSDC(baseUnits: number, recipientAddress?: string): Promise<WithdrawResult> {
    this.ensureInitialized();
    if (baseUnits <= 0) {
      throw new Error('Withdrawal amount must be greater than 0');
    }
    try {
      const result = await this.client.withdrawUSDC({
        base_units: baseUnits,
        recipientAddress,
      });
      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      throw new Error(`Failed to withdraw USDC: ${errorMessage}`);
    }
  }

  /**
   * Withdraw any SPL token from Privacy Cash
   */
  async withdrawSPL(mintAddress: string, baseUnits: number, recipientAddress?: string): Promise<WithdrawResult> {
    this.ensureInitialized();
    if (baseUnits <= 0) {
      throw new Error('Withdrawal amount must be greater than 0');
    }
    if (!mintAddress) {
      throw new Error('Mint address is required');
    }
    try {
      const result = await this.client.withdrawSPL({
        mintAddress,
        base_units: baseUnits,
        recipientAddress,
      });
      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      throw new Error(`Failed to withdraw SPL token ${mintAddress}: ${errorMessage}`);
    }
  }

  /**
   * Clear the UTXO cache
   */
  async clearCache(): Promise<void> {
    this.ensureInitialized();
    try {
      await this.client.clearCache();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      throw new Error(`Failed to clear cache: ${errorMessage}`);
    }
  }

  /**
   * Get the public key of this client
   */
  getPublicKey(): PublicKey {
    return this.keypair.publicKey;
  }

  /**
   * Get the keypair
   */
  getKeypair(): Keypair {
    return this.keypair;
  }
}

/**
 * Create a server-side Privacy Cash client from a base64 encoded session keypair
 */
export async function createServerPrivacyClient(
  rpcUrl: string,
  sessionKeypairBase64: string
): Promise<PrivacyCashServer> {
  if (!rpcUrl) {
    throw new Error('RPC URL is required');
  }
  if (!sessionKeypairBase64) {
    throw new Error('Session keypair is required');
  }

  let keypair: Keypair;
  try {
    const secretKey = Buffer.from(sessionKeypairBase64, 'base64');
    keypair = Keypair.fromSecretKey(secretKey);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    throw new Error(`Invalid session keypair: ${errorMessage}`);
  }

  const client = new PrivacyCashServer(rpcUrl, keypair);
  await client.initialize();

  return client;
}

/**
 * Get token balance with proper decimal conversion
 */
export async function getTokenBalance(
  client: PrivacyCashServer,
  tokenMint: string
): Promise<{ baseUnits: number; amount: number }> {
  let baseUnits = 0;
  let decimals = 6;

  if (tokenMint === SOL_MINT) {
    baseUnits = await client.getPrivateBalanceSOL();
    decimals = 9;
  } else if (tokenMint === USDC_MINT) {
    baseUnits = await client.getPrivateBalanceUSDC();
    decimals = 6;
  } else {
    baseUnits = await client.getPrivateBalanceSPL(tokenMint);
    decimals = 6; // Default to 6 for other SPL tokens
  }

  return {
    baseUnits,
    amount: baseUnits / Math.pow(10, decimals),
  };
}
