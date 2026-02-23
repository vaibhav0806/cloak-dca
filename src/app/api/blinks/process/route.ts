import { NextRequest, NextResponse } from 'next/server';
import {
  Keypair,
  PublicKey,
  Transaction,
  SystemProgram,
} from '@solana/web3.js';
import {
  createTransferCheckedInstruction,
  getAssociatedTokenAddress,
  createAssociatedTokenAccountInstruction,
  getAccount,
} from '@solana/spl-token';
import { addHours } from 'date-fns';
import { getConnection } from '@/lib/solana/connection';
import { createServiceClient } from '@/lib/supabase/server';
import { createServerPrivacyClient } from '@/lib/privacy/server';
import { getEscrowKeypair, getEscrowPublicKey } from '@/lib/blinks/escrow';
import { USDC_MINT } from '@/lib/solana/constants';
import type { BlinkDeposit } from '@/types';

const STALE_DEPOSIT_MINUTES = 30;
const GAS_LAMPORTS = 10_000_000; // 0.01 SOL for session wallet gas

/**
 * Confirm a transaction using polling (serverless-friendly)
 */
async function confirmTransactionPolling(
  signature: string,
  maxRetries = 30,
  retryDelay = 1000
): Promise<boolean> {
  const connection = getConnection();
  for (let i = 0; i < maxRetries; i++) {
    const status = await connection.getSignatureStatus(signature);
    if (
      status?.value?.confirmationStatus === 'confirmed' ||
      status?.value?.confirmationStatus === 'finalized'
    ) {
      return true;
    }
    if (status?.value?.err) {
      throw new Error(`Transaction failed: ${JSON.stringify(status.value.err)}`);
    }
    await new Promise((resolve) => setTimeout(resolve, retryDelay));
  }
  throw new Error('Transaction confirmation timeout');
}

/**
 * Blink deposit processor cron endpoint
 *
 * Phase 1: Confirm pending deposits by checking on-chain reference keys
 * Phase 2: Process confirmed deposits (create session wallet, privacy deposit, DCA config)
 * Phase 3: Expire stale unconfirmed deposits
 */
export async function GET(request: NextRequest) {
  try {
    // Verify cron secret
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;

    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = createServiceClient();
    const connection = getConnection();
    const rpcUrl =
      process.env.NEXT_PUBLIC_HELIUS_RPC_URL || 'https://api.devnet.solana.com';
    const now = new Date();
    const results: Array<{ id: string; phase: string; status: string; error?: string }> = [];

    // ========================================
    // Phase 1: Confirm pending deposits
    // ========================================
    const { data: pendingDeposits } = await supabase
      .from('blink_deposits')
      .select('*')
      .eq('status', 'pending_confirmation')
      .order('created_at', { ascending: true })
      .limit(20);

    for (const deposit of (pendingDeposits || []) as BlinkDeposit[]) {
      try {
        const referenceKey = new PublicKey(deposit.reference_key);
        const signatures = await connection.getSignaturesForAddress(referenceKey, {
          limit: 1,
        });

        if (signatures.length > 0 && !signatures[0].err) {
          const txSignature = signatures[0].signature;

          // Verify the transaction details match
          const txInfo = await connection.getParsedTransaction(txSignature, {
            maxSupportedTransactionVersion: 0,
          });

          if (txInfo) {
            await supabase
              .from('blink_deposits')
              .update({
                status: 'confirmed',
                tx_signature: txSignature,
                confirmed_at: now.toISOString(),
              })
              .eq('id', deposit.id)
              .eq('status', 'pending_confirmation');

            results.push({ id: deposit.id, phase: 'confirm', status: 'confirmed' });
          }
        }
      } catch (error) {
        console.error(`Error confirming deposit ${deposit.id}:`, error);
        results.push({
          id: deposit.id,
          phase: 'confirm',
          status: 'error',
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    // ========================================
    // Phase 2: Process confirmed deposits
    // ========================================
    const { data: confirmedDeposits } = await supabase
      .from('blink_deposits')
      .select('*')
      .eq('status', 'confirmed')
      .order('confirmed_at', { ascending: true })
      .limit(5);

    for (const deposit of (confirmedDeposits || []) as BlinkDeposit[]) {
      try {
        // Atomic lock
        const { data: locked, error: lockError } = await supabase
          .from('blink_deposits')
          .update({ status: 'processing' })
          .eq('id', deposit.id)
          .eq('status', 'confirmed')
          .select()
          .single();

        if (lockError || !locked) {
          console.log(`Deposit ${deposit.id} already being processed, skipping`);
          continue;
        }

        // Find or create user
        let userId: string;
        const { data: existingUser } = await supabase
          .from('users')
          .select('id')
          .eq('wallet_address', deposit.user_wallet)
          .single();

        if (existingUser) {
          userId = existingUser.id;
        } else {
          const { data: newUser, error: userError } = await supabase
            .from('users')
            .insert({ wallet_address: deposit.user_wallet })
            .select('id')
            .single();
          if (userError || !newUser) {
            throw new Error(`Failed to create user: ${userError?.message}`);
          }
          userId = newUser.id;
        }

        // Generate session keypair for this Blink DCA
        const sessionKeypair = Keypair.generate();
        const sessionBase64 = Buffer.from(sessionKeypair.secretKey).toString('base64');
        const sessionPubkey = sessionKeypair.publicKey;

        const escrowKeypair = getEscrowKeypair();
        const escrowPubkey = getEscrowPublicKey();
        const usdcMint = new PublicKey(USDC_MINT);
        const amountBaseUnits = Math.floor(deposit.amount * 1e6);

        // Transfer SOL from escrow to session wallet for gas
        console.log(
          `Transferring ${GAS_LAMPORTS / 1e9} SOL to session wallet ${sessionPubkey.toBase58()}`
        );
        const solTransferTx = new Transaction().add(
          SystemProgram.transfer({
            fromPubkey: escrowPubkey,
            toPubkey: sessionPubkey,
            lamports: GAS_LAMPORTS,
          })
        );
        solTransferTx.feePayer = escrowPubkey;
        solTransferTx.recentBlockhash = (
          await connection.getLatestBlockhash('confirmed')
        ).blockhash;
        solTransferTx.sign(escrowKeypair);
        const solTxSig = await connection.sendRawTransaction(solTransferTx.serialize());
        await confirmTransactionPolling(solTxSig);
        console.log(`SOL transfer confirmed: ${solTxSig}`);

        // Transfer USDC from escrow to session wallet
        console.log(
          `Transferring ${deposit.amount} USDC to session wallet ${sessionPubkey.toBase58()}`
        );
        const escrowAta = await getAssociatedTokenAddress(usdcMint, escrowPubkey);
        const sessionAta = await getAssociatedTokenAddress(usdcMint, sessionPubkey);

        const usdcTransferTx = new Transaction();
        usdcTransferTx.feePayer = escrowPubkey;
        usdcTransferTx.recentBlockhash = (
          await connection.getLatestBlockhash('confirmed')
        ).blockhash;

        // Create session wallet's USDC ATA if needed
        try {
          await getAccount(connection, sessionAta);
        } catch {
          usdcTransferTx.add(
            createAssociatedTokenAccountInstruction(
              escrowPubkey,
              sessionAta,
              sessionPubkey,
              usdcMint
            )
          );
        }

        usdcTransferTx.add(
          createTransferCheckedInstruction(
            escrowAta,
            usdcMint,
            sessionAta,
            escrowPubkey,
            amountBaseUnits,
            6
          )
        );
        usdcTransferTx.sign(escrowKeypair);
        const usdcTxSig = await connection.sendRawTransaction(usdcTransferTx.serialize());
        await confirmTransactionPolling(usdcTxSig);
        console.log(`USDC transfer confirmed: ${usdcTxSig}`);

        // Deposit USDC from session wallet into Privacy.cash pool
        console.log(`Depositing ${deposit.amount} USDC into Privacy.cash pool`);
        const privacyClient = await createServerPrivacyClient(rpcUrl, sessionBase64);
        const depositResult = await privacyClient.depositUSDC(amountBaseUnits);
        console.log(`Privacy deposit tx: ${depositResult.tx}`);
        await confirmTransactionPolling(depositResult.tx);
        console.log('Privacy deposit confirmed');

        // Create DCA config
        const totalTrades = Math.ceil(deposit.amount / deposit.amount_per_trade);
        const { data: dcaConfig, error: dcaError } = await supabase
          .from('dca_configs')
          .insert({
            user_id: userId,
            input_token: USDC_MINT,
            output_token: deposit.output_token,
            total_amount: deposit.amount,
            amount_per_trade: deposit.amount_per_trade,
            frequency_hours: deposit.frequency_hours,
            total_trades: totalTrades,
            completed_trades: 0,
            status: 'active',
            encrypted_data: sessionBase64,
            next_execution: addHours(now, deposit.frequency_hours).toISOString(),
            source: 'blink',
            blink_deposit_id: deposit.id,
          })
          .select('id')
          .single();

        if (dcaError || !dcaConfig) {
          throw new Error(`Failed to create DCA config: ${dcaError?.message}`);
        }

        // Mark deposit as processed
        await supabase
          .from('blink_deposits')
          .update({
            status: 'processed',
            dca_config_id: dcaConfig.id,
            processed_at: now.toISOString(),
          })
          .eq('id', deposit.id);

        results.push({ id: deposit.id, phase: 'process', status: 'processed' });
        console.log(
          `Blink deposit ${deposit.id} processed → DCA config ${dcaConfig.id}`
        );
      } catch (error) {
        console.error(`Error processing deposit ${deposit.id}:`, error);

        // Reset to confirmed for retry on next run
        await supabase
          .from('blink_deposits')
          .update({
            status: 'confirmed',
            error_message: error instanceof Error ? error.message : 'Unknown error',
          })
          .eq('id', deposit.id);

        results.push({
          id: deposit.id,
          phase: 'process',
          status: 'error',
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    // ========================================
    // Phase 3: Expire stale deposits
    // ========================================
    const staleThreshold = new Date(
      now.getTime() - STALE_DEPOSIT_MINUTES * 60 * 1000
    ).toISOString();

    const { data: staleDeposits } = await supabase
      .from('blink_deposits')
      .update({
        status: 'failed',
        error_message: 'Deposit expired — transaction was not confirmed within 30 minutes',
      })
      .eq('status', 'pending_confirmation')
      .lt('created_at', staleThreshold)
      .select('id');

    for (const stale of staleDeposits || []) {
      results.push({ id: stale.id, phase: 'expire', status: 'expired' });
    }

    return NextResponse.json({
      processed: results.length,
      results,
      timestamp: now.toISOString(),
    });
  } catch (error) {
    console.error('Blink processor error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
