import { VersionedTransaction } from '@solana/web3.js';
import type { JupiterQuote } from '@/types';

// Jupiter API with authentication
const JUPITER_API_BASE = 'https://api.jup.ag/swap/v1';

function getJupiterHeaders() {
  const apiKey = process.env.JUPITER_API_KEY;
  if (!apiKey) {
    throw new Error('JUPITER_API_KEY environment variable is not set');
  }
  return {
    'Content-Type': 'application/json',
    'x-api-key': apiKey,
  };
}

export interface GetQuoteParams {
  inputMint: string;
  outputMint: string;
  amount: number;
  slippageBps?: number;
}

export interface GetSwapParams {
  quoteResponse: JupiterQuote;
  userPublicKey: string;
  wrapAndUnwrapSol?: boolean;
  dynamicComputeUnitLimit?: boolean;
}

export interface SwapResponse {
  swapTransaction: string;
  lastValidBlockHeight: number;
  prioritizationFeeLamports?: number;
  computeUnitLimit?: number;
  simulationError?: string | null;
}

/**
 * Get a quote for swapping tokens via Jupiter
 */
export async function getQuote({
  inputMint,
  outputMint,
  amount,
  slippageBps = 50, // 0.5% default slippage
}: GetQuoteParams): Promise<JupiterQuote> {
  const params = new URLSearchParams({
    inputMint,
    outputMint,
    amount: amount.toString(),
    slippageBps: slippageBps.toString(),
  });

  const response = await fetch(`${JUPITER_API_BASE}/quote?${params}`, {
    headers: getJupiterHeaders(),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Jupiter quote failed: ${error}`);
  }

  return response.json();
}

/**
 * Get a swap transaction from Jupiter
 */
export async function getSwapTransaction({
  quoteResponse,
  userPublicKey,
  wrapAndUnwrapSol = true,
  dynamicComputeUnitLimit = true,
}: GetSwapParams): Promise<{ transaction: VersionedTransaction; lastValidBlockHeight: number }> {
  const response = await fetch(`${JUPITER_API_BASE}/swap`, {
    method: 'POST',
    headers: getJupiterHeaders(),
    body: JSON.stringify({
      quoteResponse,
      userPublicKey,
      wrapAndUnwrapSol,
      dynamicComputeUnitLimit,
      // Use priority fees for better transaction landing on mainnet
      prioritizationFeeLamports: {
        priorityLevelWithMaxLamports: {
          maxLamports: 1000000, // Max 0.001 SOL
          priorityLevel: 'high',
        },
      },
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Jupiter swap failed: ${error}`);
  }

  const data: SwapResponse = await response.json();

  // Check for simulation errors
  if (data.simulationError) {
    const errorDetails = typeof data.simulationError === 'string'
      ? data.simulationError
      : JSON.stringify(data.simulationError, null, 2);
    throw new Error(`Swap simulation failed: ${errorDetails}`);
  }

  // Deserialize the transaction
  const transactionBuffer = Buffer.from(data.swapTransaction, 'base64');
  const transaction = VersionedTransaction.deserialize(transactionBuffer);

  return { transaction, lastValidBlockHeight: data.lastValidBlockHeight };
}

/**
 * Get token price in USDC
 */
export async function getTokenPrice(tokenMint: string): Promise<number> {
  try {
    const response = await fetch(
      `https://api.jup.ag/price/v2?ids=${tokenMint}`,
      { headers: getJupiterHeaders() }
    );

    if (!response.ok) {
      return 0;
    }

    const data = await response.json();
    return data.data?.[tokenMint]?.price || 0;
  } catch (error) {
    console.error('Error fetching token price:', error);
    return 0;
  }
}

/**
 * Execute a swap with retry logic
 */
export async function executeSwapWithRetry(
  params: GetQuoteParams,
  userPublicKey: string,
  signTransaction: (tx: VersionedTransaction) => Promise<VersionedTransaction>,
  maxRetries = 3
): Promise<{ quote: JupiterQuote; signedTransaction: VersionedTransaction; lastValidBlockHeight: number }> {
  let lastError: Error | null = null;

  for (let i = 0; i < maxRetries; i++) {
    try {
      // Get fresh quote
      const quote = await getQuote(params);

      // Get swap transaction
      const { transaction, lastValidBlockHeight } = await getSwapTransaction({
        quoteResponse: quote,
        userPublicKey,
      });

      // Sign the transaction
      const signedTransaction = await signTransaction(transaction);

      return { quote, signedTransaction, lastValidBlockHeight };
    } catch (error) {
      lastError = error as Error;
      console.error(`Swap attempt ${i + 1} failed:`, error);

      // Wait before retrying
      if (i < maxRetries - 1) {
        await new Promise((resolve) => setTimeout(resolve, 1000 * (i + 1)));
      }
    }
  }

  throw lastError || new Error('Swap failed after retries');
}
