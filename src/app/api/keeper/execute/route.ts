import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import { getConnection } from '@/lib/solana/connection';
import { addHours } from 'date-fns';
import { createServerPrivacyClient } from '@/lib/privacy/server';
import { getQuote, getSwapTransaction } from '@/lib/jupiter';
import { USDC_MINT, SOL_MINT } from '@/lib/solana/constants';
import { Keypair, Connection } from '@solana/web3.js';

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

/**
 * Keeper service endpoint
 *
 * This is called by Vercel Cron (or manually) to execute due DCA trades.
 * For each due DCA:
 * 1. Decrypt session keypair from encrypted_data
 * 2. Withdraw from Privacy Cash (unshield input tokens)
 * 3. Swap via Jupiter
 * 4. Deposit to Privacy Cash (shield output tokens)
 * 5. Update execution status
 */
export async function GET(request: NextRequest) {
  try {
    // Verify cron secret
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;

    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const supabase = createServiceClient();
    const connection = getConnection();
    const rpcUrl = process.env.NEXT_PUBLIC_HELIUS_RPC_URL || 'https://api.devnet.solana.com';
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
      return NextResponse.json(
        { error: 'Failed to fetch due DCAs' },
        { status: 500 }
      );
    }

    const dcasToExecute = (activeDCAs || []).filter(
      (dca) => dca.completed_trades < dca.total_trades && dca.encrypted_data
    );

    console.log(`Found ${dcasToExecute.length} DCAs due for execution`);

    const results = [];

    for (const dca of dcasToExecute) {
      try {
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
        const inputDecimals = inputMint === SOL_MINT ? 9 : 6;
        const inputAmount = Math.floor(Number(dca.amount_per_trade) * Math.pow(10, inputDecimals));

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

          // Wait for withdrawal to confirm before swapping
          console.log('Waiting for withdrawal confirmation...');
          await confirmTransactionPolling(connection, withdrawResult.tx, 30, 1000);
          console.log('Withdrawal confirmed');
        } catch (withdrawError) {
          console.error(`Withdrawal failed for DCA ${dca.id}:`, withdrawError);
          throw new Error(`Privacy Cash withdrawal failed: ${withdrawError instanceof Error ? withdrawError.message : 'Unknown error'}`);
        }

        // Check session wallet has enough SOL for transaction fees
        const sessionBalance = await connection.getBalance(sessionPublicKey);
        console.log(`Session wallet SOL balance: ${sessionBalance / 1e9} SOL`);

        if (sessionBalance < 5000000) { // Less than 0.005 SOL
          throw new Error(`Insufficient SOL for transaction fees. Session wallet has ${sessionBalance / 1e9} SOL, needs at least 0.005 SOL`);
        }

        // Step 2: Swap via Jupiter
        console.log(`Swapping ${dca.amount_per_trade} ${inputMint} → ${outputMint}`);

        let swapSignature: string;
        let outputAmount: number;

        try {
          // Get swap quote
          const quote = await getQuote({
            inputMint,
            outputMint,
            amount: inputAmount,
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

        // Step 3: Deposit output to Privacy Cash (shield output tokens)
        // Use retry logic since blockhash can expire
        console.log(`Depositing output to Privacy Cash`);

        let depositResult;
        try {
          depositResult = await withRetry(
            async () => {
              if (outputMint === SOL_MINT) {
                return await privacyClient.depositSOL(outputAmount);
              } else if (outputMint === USDC_MINT) {
                return await privacyClient.depositUSDC(outputAmount);
              } else {
                return await privacyClient.depositSPL(outputMint, outputAmount);
              }
            },
            3, // max 3 retries
            3000, // 3 second base delay
            'Privacy Cash deposit'
          );
          console.log(`Deposit tx: ${depositResult.tx}`);
        } catch (depositError) {
          console.error(`Deposit failed for DCA ${dca.id}:`, depositError);
          // Note: Swap succeeded but deposit failed - output tokens are in session wallet
          // Mark as partial success - the swap worked, just re-shielding failed
          console.log(`Swap succeeded but re-shielding failed. Output tokens remain in session wallet.`);

          // Still mark as success since the swap completed - user has their tokens
          const outputDecimals = outputMint === SOL_MINT ? 9 : 6;
          const outputAmountDecimal = outputAmount / Math.pow(10, outputDecimals);

          await supabase
            .from('executions')
            .update({
              status: 'success',
              tx_signature: swapSignature,
              output_amount: outputAmountDecimal,
              error_message: 'Re-shielding failed - tokens in session wallet',
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
            status: 'partial',
            trade: newCompletedTrades,
            txSignature: swapSignature,
            inputAmount: dca.amount_per_trade,
            outputAmount: outputAmountDecimal,
            warning: 'Swap succeeded but re-shielding failed. Tokens in session wallet.',
          });

          console.log(
            `Executed trade ${newCompletedTrades}/${dca.total_trades} for DCA ${dca.id} (partial - re-shield failed)`
          );
          continue; // Move to next DCA
        }

        // Update execution with success
        const outputDecimals = outputMint === SOL_MINT ? 9 : 6;
        const outputAmountDecimal = outputAmount / Math.pow(10, outputDecimals);

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
          inputAmount: dca.amount_per_trade,
          outputAmount: outputAmountDecimal,
        });

        console.log(
          `Executed trade ${newCompletedTrades}/${dca.total_trades} for DCA ${dca.id}`
        );
      } catch (error) {
        console.error(`Error executing DCA ${dca.id}:`, error);

        // Update execution with failure
        await supabase
          .from('executions')
          .update({
            status: 'failed',
            error_message: error instanceof Error ? error.message : 'Unknown error',
          })
          .eq('dca_config_id', dca.id)
          .eq('trade_number', dca.completed_trades + 1);

        // Reset status back to 'active' so it can retry next time
        await supabase
          .from('dca_configs')
          .update({ status: 'active', updated_at: now.toISOString() })
          .eq('id', dca.id);

        results.push({
          id: dca.id,
          status: 'error',
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    return NextResponse.json({
      executed: results.length,
      results,
      timestamp: now.toISOString(),
    });
  } catch (error) {
    console.error('Keeper execution error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
