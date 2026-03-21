import { SupabaseClient } from '@supabase/supabase-js';
import { Connection, Keypair, PublicKey } from '@solana/web3.js';
import { getAssociatedTokenAddress } from '@solana/spl-token';
import { addHours } from 'date-fns';
import { createServerPrivacyClient } from '@/lib/privacy/server';
import { getQuote, getSwapTransaction } from '@/lib/jupiter';
import { USDC_MINT, SOL_MINT, CBBTC_MINT, ZEC_MINT } from '@/lib/solana/constants';

const MAX_CONSECUTIVE_FAILURES = 3;

const UNRECOVERABLE_PATTERNS = [
  'No enough balance to withdraw',
  'Insufficient SOL for transaction fees',
  'Balance too low after fees',
  'not initialized',
];

/**
 * Get the number of decimals for a token mint
 */
function getTokenDecimals(mint: string): number {
  if (mint === SOL_MINT) return 9;
  if (mint === CBBTC_MINT || mint === ZEC_MINT) return 8;
  return 6; // USDC, USDT, and default
}

/**
 * Confirm a transaction using polling instead of WebSocket subscriptions
 * This works better in serverless environments
 */
async function confirmTransactionPolling(
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

/**
 * Retry a function with exponential backoff
 */
async function withRetry<T>(
  fn: () => Promise<T>,
  maxRetries = 3,
  baseDelay = 2000,
  description = 'operation'
): Promise<T> {
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;
      console.log(`${description} attempt ${attempt}/${maxRetries} failed: ${lastError.message}`);

      if (attempt < maxRetries) {
        const delay = baseDelay * attempt;
        console.log(`Retrying in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  throw lastError || new Error(`${description} failed after ${maxRetries} attempts`);
}

function isUnrecoverableError(message: string): boolean {
  return UNRECOVERABLE_PATTERNS.some(pattern =>
    message.toLowerCase().includes(pattern.toLowerCase())
  );
}

export interface KeeperResult {
  id: string;
  status: string;
  error?: string;
  trade?: number;
  txSignature?: string;
  inputAmount?: number;
  outputAmount?: number;
}

/**
 * Execute all due DCA trades.
 *
 * This is the core keeper logic, free of any Next.js dependencies.
 * It receives a SupabaseClient and Connection via dependency injection
 * so it can be called from both the API route and a standalone script.
 */
export async function executeKeeperDCAs(
  supabase: SupabaseClient,
  connection: Connection,
  rpcUrl: string
): Promise<{ executed: number; results: KeeperResult[]; timestamp: string }> {
  const now = new Date();

  // Get DCAs that are due for execution
  const { data: activeDCAs, error: fetchError } = await supabase
    .from('dca_configs')
    .select(`
      *,
      users!inner(wallet_address)
    `)
    .eq('status', 'active')
    .lte('next_execution', now.toISOString());

  if (fetchError) {
    console.error('Error fetching due DCAs:', fetchError);
    throw new Error('Failed to fetch due DCAs');
  }

  const dcasToExecute = (activeDCAs || []).filter(
    (dca: any) => dca.completed_trades < dca.total_trades && dca.encrypted_data
  );

  console.log(`Found ${dcasToExecute.length} DCAs due for execution`);

  const results: KeeperResult[] = [];

  for (const dca of dcasToExecute) {
    try {
      // Check consecutive failures — skip DCAs that have failed too many times
      const { data: recentExecs } = await supabase
        .from('executions')
        .select('status, error_message')
        .eq('dca_config_id', dca.id)
        .order('executed_at', { ascending: false })
        .limit(MAX_CONSECUTIVE_FAILURES);

      if (recentExecs && recentExecs.length >= MAX_CONSECUTIVE_FAILURES) {
        const allFailed = recentExecs.every((e: any) => e.status === 'failed');
        if (allFailed) {
          const lastError = recentExecs[0]?.error_message || 'Unknown';
          console.log(`DCA ${dca.id} paused: ${MAX_CONSECUTIVE_FAILURES} consecutive failures. Last error: ${lastError}`);
          await supabase
            .from('dca_configs')
            .update({ status: 'paused', updated_at: now.toISOString() })
            .eq('id', dca.id);
          results.push({ id: dca.id, status: 'paused', error: `Auto-paused after ${MAX_CONSECUTIVE_FAILURES} consecutive failures` });
          continue;
        }
      }

      // Atomic lock: set status to 'executing' only if still 'active'
      // This prevents double execution if keeper runs twice simultaneously
      const { data: lockResult, error: lockError } = await supabase
        .from('dca_configs')
        .update({ status: 'executing', updated_at: now.toISOString() })
        .eq('id', dca.id)
        .eq('status', 'active') // Only lock if still active (atomic check)
        .select()
        .single();

      if (lockError || !lockResult) {
        console.log(`DCA ${dca.id} already being executed or not active, skipping`);
        continue;
      }

      // Create execution record
      const { data: execution, error: execError } = await supabase
        .from('executions')
        .insert({
          dca_config_id: dca.id,
          trade_number: dca.completed_trades + 1,
          input_amount: dca.amount_per_trade,
          status: 'pending',
          executed_at: now.toISOString(),
        })
        .select()
        .single();

      if (execError) {
        console.error(`Error creating execution for DCA ${dca.id}:`, execError);
        results.push({ id: dca.id, status: 'error', error: 'Failed to create execution' });
        continue;
      }

      // Decrypt session keypair
      const user = dca.users as { wallet_address: string };
      let sessionKeypairBase64: string;

      try {
        // The encrypted_data contains the session keypair encrypted with the user's wallet signature
        // For now, we assume it's stored as base64 (in production, use proper encryption)
        sessionKeypairBase64 = dca.encrypted_data;

        if (!sessionKeypairBase64) {
          throw new Error('No session keypair found');
        }
      } catch (decryptError) {
        console.error(`Error decrypting session for DCA ${dca.id}:`, decryptError);
        throw new Error('Failed to decrypt session keypair');
      }

      // Initialize Privacy Cash client with session keypair
      const privacyClient = await createServerPrivacyClient(rpcUrl, sessionKeypairBase64);
      const sessionPublicKey = privacyClient.getPublicKey();

      console.log(`Executing DCA ${dca.id} for wallet ${user.wallet_address}`);
      console.log(`Session wallet: ${sessionPublicKey.toBase58()}`);

      // Determine token mints and amounts
      const inputMint = dca.input_token;
      const outputMint = dca.output_token;
      const inputDecimals = getTokenDecimals(inputMint);
      const outputDecimals = getTokenDecimals(outputMint);
      const inputAmount = Math.floor(Number(dca.amount_per_trade) * Math.pow(10, inputDecimals));

      // Check if session wallet already has enough tokens (from previous failed attempt)
      let existingBalance = 0;
      if (inputMint !== SOL_MINT) {
        try {
          const inputMintPubkey = new PublicKey(inputMint);
          const ata = await getAssociatedTokenAddress(inputMintPubkey, sessionPublicKey);
          const tokenAccountInfo = await connection.getTokenAccountBalance(ata);
          existingBalance = Number(tokenAccountInfo.value.amount);
          console.log(`Existing ${inputMint === USDC_MINT ? 'USDC' : 'token'} balance in session wallet: ${tokenAccountInfo.value.uiAmount}`);
        } catch {
          // No existing balance
        }
      }

      // Only withdraw if we don't have enough already
      const minimumRequired = Math.floor(inputAmount * 0.1); // At least 10% of target
      if (existingBalance >= minimumRequired) {
        console.log(`Using existing balance (${existingBalance / Math.pow(10, inputDecimals)}), skipping withdrawal to save fees`);
      } else {
        // Step 1: Withdraw from Privacy Cash (unshield input tokens)
        console.log(`Withdrawing ${dca.amount_per_trade} ${inputMint === USDC_MINT ? 'USDC' : 'tokens'} from Privacy Cash`);

        let withdrawResult;
        try {
          if (inputMint === SOL_MINT) {
            withdrawResult = await privacyClient.withdrawSOL(inputAmount, sessionPublicKey.toBase58());
          } else if (inputMint === USDC_MINT) {
            withdrawResult = await privacyClient.withdrawUSDC(inputAmount, sessionPublicKey.toBase58());
          } else {
            withdrawResult = await privacyClient.withdrawSPL(inputMint, inputAmount, sessionPublicKey.toBase58());
          }
          console.log(`Withdrawal tx: ${withdrawResult.tx}`);
          console.log(`Withdrawal result:`, JSON.stringify(withdrawResult, null, 2));

          // Wait for withdrawal to confirm before swapping
          console.log('Waiting for withdrawal confirmation...');
          await confirmTransactionPolling(connection, withdrawResult.tx, 30, 1000);
          console.log('Withdrawal confirmed');
        } catch (withdrawError) {
          console.error(`Withdrawal failed for DCA ${dca.id}:`, withdrawError);
          throw new Error(`Privacy Cash withdrawal failed: ${withdrawError instanceof Error ? withdrawError.message : 'Unknown error'}`);
        }
      }

      // Check session wallet has enough SOL for transaction fees
      const sessionBalance = await connection.getBalance(sessionPublicKey);
      console.log(`Session wallet SOL balance: ${sessionBalance / 1e9} SOL`);

      if (sessionBalance < 5000000) { // Less than 0.005 SOL
        throw new Error(`Insufficient SOL for transaction fees. Session wallet has ${sessionBalance / 1e9} SOL, needs at least 0.005 SOL`);
      }

      // Check input token balance in session wallet and use actual available amount
      let actualInputAmount = inputAmount;
      if (inputMint !== SOL_MINT) {
        try {
          const inputMintPubkey = new PublicKey(inputMint);
          const ata = await getAssociatedTokenAddress(inputMintPubkey, sessionPublicKey);
          const tokenAccountInfo = await connection.getTokenAccountBalance(ata);
          const availableBalance = Number(tokenAccountInfo.value.amount);
          console.log(`Session wallet ${inputMint === USDC_MINT ? 'USDC' : 'token'} balance: ${tokenAccountInfo.value.uiAmount}`);

          // Use whatever is available in the session wallet
          if (availableBalance < inputAmount) {
            console.log(`Privacy Cash fees reduced balance. Expected ${dca.amount_per_trade}, have ${tokenAccountInfo.value.uiAmount}`);

            // Minimum viable swap: at least 0.1 USDC (100000 base units)
            if (availableBalance < 100000) {
              throw new Error(`Balance too low after fees. Have ${tokenAccountInfo.value.uiAmount}, minimum is 0.1 USDC`);
            }

            actualInputAmount = availableBalance;
            console.log(`Using available balance: ${actualInputAmount / Math.pow(10, inputDecimals)} for swap`);
          }
        } catch (tokenError) {
          if ((tokenError as Error).message.includes('Balance too low') ||
              (tokenError as Error).message.includes('Insufficient')) {
            throw tokenError;
          }
          console.log(`Could not check token balance (ATA may not exist): ${(tokenError as Error).message}`);
        }
      }

      // Step 2: Swap via Jupiter
      const actualInputDecimal = actualInputAmount / Math.pow(10, inputDecimals);
      console.log(`Swapping ${actualInputDecimal} ${inputMint === USDC_MINT ? 'USDC' : 'tokens'} → ${outputMint === SOL_MINT ? 'SOL' : outputMint}`);

      let swapSignature: string;
      let outputAmount: number;

      try {
        // Get swap quote with actual available amount
        const quote = await getQuote({
          inputMint,
          outputMint,
          amount: actualInputAmount,
          slippageBps: 100, // 1% slippage for better success rate
        });

        if (!quote) {
          throw new Error('Failed to get swap quote');
        }

        outputAmount = Number(quote.outAmount);
        console.log(`Quote received: ${inputAmount} -> ${outputAmount}`);

        // Get swap transaction
        const { transaction: versionedTx, lastValidBlockHeight } = await getSwapTransaction({
          quoteResponse: quote,
          userPublicKey: sessionPublicKey.toBase58(),
        });

        // Sign with session keypair
        const sessionSecretKey = Buffer.from(sessionKeypairBase64, 'base64');
        const sessionKeypair = Keypair.fromSecretKey(sessionSecretKey);
        versionedTx.sign([sessionKeypair]);

        // Send with skipPreflight for faster submission
        swapSignature = await connection.sendTransaction(versionedTx, {
          skipPreflight: true,
          maxRetries: 5,
        });

        console.log(`Swap tx sent: ${swapSignature}`);

        // Confirm using polling with block height check
        await confirmTransactionPolling(connection, swapSignature, 60, 500);
        console.log(`Swap confirmed: ${swapSignature}`);
      } catch (swapError) {
        console.error(`Swap failed for DCA ${dca.id}:`, swapError);
        throw new Error(`Jupiter swap failed: ${swapError instanceof Error ? swapError.message : 'Unknown error'}`);
      }

      // Output tokens stay in session wallet (user can withdraw via "Ready to Withdraw")
      // No re-shielding - simpler flow and tokens are immediately visible
      const outputAmountDecimal = outputAmount / Math.pow(10, outputDecimals);
      console.log(`Swap complete. ${outputAmountDecimal} ${outputMint === SOL_MINT ? 'SOL' : 'tokens'} now in session wallet`);

      // Update execution with success
      await supabase
        .from('executions')
        .update({
          status: 'success',
          tx_signature: swapSignature,
          output_amount: outputAmountDecimal,
        })
        .eq('id', execution.id);

      // Update DCA config
      const newCompletedTrades = dca.completed_trades + 1;
      const isCompleted = newCompletedTrades >= dca.total_trades;

      await supabase
        .from('dca_configs')
        .update({
          completed_trades: newCompletedTrades,
          status: isCompleted ? 'completed' : 'active',
          next_execution: isCompleted
            ? null
            : addHours(now, dca.frequency_hours).toISOString(),
          updated_at: now.toISOString(),
        })
        .eq('id', dca.id);

      results.push({
        id: dca.id,
        status: 'success',
        trade: newCompletedTrades,
        txSignature: swapSignature,
        inputAmount: actualInputAmount / Math.pow(10, inputDecimals),
        outputAmount: outputAmountDecimal,
      });

      console.log(
        `Executed trade ${newCompletedTrades}/${dca.total_trades} for DCA ${dca.id}`
      );
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error(`Error executing DCA ${dca.id}:`, errorMessage);

      // Update execution with failure
      await supabase
        .from('executions')
        .update({
          status: 'failed',
          error_message: errorMessage,
        })
        .eq('dca_config_id', dca.id)
        .eq('trade_number', dca.completed_trades + 1);

      if (isUnrecoverableError(errorMessage)) {
        // Pause immediately — this DCA needs user intervention
        console.log(`DCA ${dca.id} paused: unrecoverable error — ${errorMessage}`);
        await supabase
          .from('dca_configs')
          .update({ status: 'paused', updated_at: now.toISOString() })
          .eq('id', dca.id);

        results.push({ id: dca.id, status: 'paused', error: errorMessage });
      } else {
        // Recoverable error — reset to active for retry on next cycle
        await supabase
          .from('dca_configs')
          .update({ status: 'active', updated_at: now.toISOString() })
          .eq('id', dca.id);

        results.push({ id: dca.id, status: 'error', error: errorMessage });
      }
    }
  }

  return {
    executed: results.length,
    results,
    timestamp: now.toISOString(),
  };
}
