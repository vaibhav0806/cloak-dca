import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import { getConnection } from '@/lib/solana/connection';
import { addHours } from 'date-fns';
import { getQuote, getSwapTransaction } from '@/lib/jupiter';
import { USDC_MINT, SOL_MINT, GOLD_MINT } from '@/lib/solana/constants';
import { Keypair, Connection, PublicKey } from '@solana/web3.js';
import { executeGrailPurchase } from '@/lib/grail/execute';

/**
 * Get the number of decimals for a token mint
 */
function getTokenDecimals(mint: string): number {
  if (mint === SOL_MINT) return 9;
  if (mint === GOLD_MINT) return 9;
  return 6; // USDC and default
}
import { getAssociatedTokenAddress } from '@solana/spl-token';

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
 * Keeper service endpoint
 *
 * This is called by Vercel Cron (or manually) to execute due DCA trades.
 * For each due DCA:
 * 1. Decrypt session keypair from encrypted_data
 * 2. Check session wallet balance directly (devnet: no privacy withdrawal)
 * 3. Route: GOLD → GRAIL purchase, else → Jupiter swap
 * 4. Update execution + DCA config
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
    const now = new Date();

    // Get DCAs that are due for execution
    const { data: activeDCAs, error: fetchError } = await supabase
      .from('dca_configs')
      .select(`
        *,
        users!inner(id, wallet_address)
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
        const { data: lockResult, error: lockError } = await supabase
          .from('dca_configs')
          .update({ status: 'executing', updated_at: now.toISOString() })
          .eq('id', dca.id)
          .eq('status', 'active')
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
        const user = dca.users as { id: string; wallet_address: string };
        let sessionKeypairBase64: string;

        try {
          sessionKeypairBase64 = dca.encrypted_data;
          if (!sessionKeypairBase64) {
            throw new Error('No session keypair found');
          }
        } catch (decryptError) {
          console.error(`Error decrypting session for DCA ${dca.id}:`, decryptError);
          throw new Error('Failed to decrypt session keypair');
        }

        // Reconstruct session keypair
        const sessionSecretKey = Buffer.from(sessionKeypairBase64, 'base64');
        const sessionKeypair = Keypair.fromSecretKey(sessionSecretKey);
        const sessionPublicKey = sessionKeypair.publicKey;

        console.log(`Executing DCA ${dca.id} for wallet ${user.wallet_address}`);
        console.log(`Session wallet: ${sessionPublicKey.toBase58()}`);

        // Determine token mints and amounts
        const inputMint = dca.input_token;
        const outputMint = dca.output_token;
        const inputDecimals = getTokenDecimals(inputMint);
        const outputDecimals = getTokenDecimals(outputMint);
        const inputAmount = Math.floor(Number(dca.amount_per_trade) * Math.pow(10, inputDecimals));

        // Check session wallet balance directly (no privacy withdrawal on devnet)
        let actualInputAmount = inputAmount;
        if (inputMint !== SOL_MINT) {
          try {
            const inputMintPubkey = new PublicKey(inputMint);
            const ata = await getAssociatedTokenAddress(inputMintPubkey, sessionPublicKey);
            const tokenAccountInfo = await connection.getTokenAccountBalance(ata);
            const availableBalance = Number(tokenAccountInfo.value.amount);
            console.log(`Session wallet balance: ${tokenAccountInfo.value.uiAmount} ${inputMint === USDC_MINT ? 'USDC' : 'tokens'}`);

            if (availableBalance < inputAmount) {
              console.log(`Expected ${dca.amount_per_trade}, have ${tokenAccountInfo.value.uiAmount}`);

              // Minimum viable swap: at least 0.1 USDC (100000 base units)
              if (availableBalance < 100000) {
                throw new Error(`Balance too low. Have ${tokenAccountInfo.value.uiAmount}, minimum is 0.1 USDC`);
              }

              actualInputAmount = availableBalance;
              console.log(`Using available balance: ${actualInputAmount / Math.pow(10, inputDecimals)}`);
            }
          } catch (tokenError) {
            if ((tokenError as Error).message.includes('Balance too low') ||
                (tokenError as Error).message.includes('Insufficient')) {
              throw tokenError;
            }
            console.log(`Could not check token balance: ${(tokenError as Error).message}`);
            throw new Error('Session wallet has no USDC. Fund the session wallet with devnet USDC first.');
          }
        }

        // Check session wallet has enough SOL for transaction fees
        const sessionBalance = await connection.getBalance(sessionPublicKey);
        console.log(`Session wallet SOL balance: ${sessionBalance / 1e9} SOL`);

        if (sessionBalance < 5000000) {
          throw new Error(`Insufficient SOL for transaction fees. Session wallet has ${sessionBalance / 1e9} SOL, needs at least 0.005 SOL`);
        }

        let swapSignature: string;
        let outputAmount: number;

        // Route: GOLD → GRAIL purchase, else → Jupiter swap
        if (outputMint === GOLD_MINT) {
          console.log(`Routing to GRAIL for gold purchase`);
          const result = await executeGrailPurchase({
            cloakUserId: user.id,
            walletAddress: user.wallet_address,
            usdcAmount: actualInputAmount / Math.pow(10, inputDecimals),
            sessionKeypair,
            supabase,
          });

          swapSignature = result.txId;
          outputAmount = result.goldAmount;

          // Store gold-specific data
          await supabase.from('executions').update({
            gold_amount: result.goldAmount,
            gold_price_at_execution: result.goldPrice,
          }).eq('id', execution.id);
        } else {
          // Jupiter swap (existing flow)
          const actualInputDecimal = actualInputAmount / Math.pow(10, inputDecimals);
          console.log(`Swapping ${actualInputDecimal} ${inputMint === USDC_MINT ? 'USDC' : 'tokens'} → ${outputMint === SOL_MINT ? 'SOL' : outputMint}`);

          const quote = await getQuote({
            inputMint,
            outputMint,
            amount: actualInputAmount,
            slippageBps: 100,
          });

          if (!quote) {
            throw new Error('Failed to get swap quote');
          }

          outputAmount = Number(quote.outAmount);
          console.log(`Quote received: ${actualInputAmount} -> ${outputAmount}`);

          const { transaction: versionedTx } = await getSwapTransaction({
            quoteResponse: quote,
            userPublicKey: sessionPublicKey.toBase58(),
          });

          versionedTx.sign([sessionKeypair]);

          swapSignature = await connection.sendTransaction(versionedTx, {
            skipPreflight: true,
            maxRetries: 5,
          });

          console.log(`Swap tx sent: ${swapSignature}`);
          await confirmTransactionPolling(connection, swapSignature, 60, 500);
          console.log(`Swap confirmed: ${swapSignature}`);
        }

        // Output tokens stay in session wallet
        const outputAmountDecimal = outputMint === GOLD_MINT
          ? outputAmount // GRAIL returns gold in troy ounces already
          : outputAmount / Math.pow(10, outputDecimals);

        console.log(`Trade complete. ${outputAmountDecimal} ${outputMint === SOL_MINT ? 'SOL' : outputMint === GOLD_MINT ? 'GOLD oz' : 'tokens'}`);

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
