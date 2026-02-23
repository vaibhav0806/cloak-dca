import { NextRequest, NextResponse } from 'next/server';
import {
  PublicKey,
  Transaction,
  Keypair,
} from '@solana/web3.js';
import {
  createTransferCheckedInstruction,
  getAssociatedTokenAddress,
  createAssociatedTokenAccountInstruction,
} from '@solana/spl-token';
import { withActionCors, actionCorsOptions } from '@/lib/blinks/cors';
import { getEscrowPublicKey } from '@/lib/blinks/escrow';
import { getConnection } from '@/lib/solana/connection';
import { createServiceClient } from '@/lib/supabase/server';
import {
  SUPPORTED_OUTPUT_TOKENS,
  FREQUENCY_OPTIONS,
  USDC_MINT,
} from '@/lib/solana/constants';

export async function OPTIONS() {
  return actionCorsOptions();
}

export async function GET(request: NextRequest) {
  const baseUrl = new URL(request.url).origin;
  const iconUrl = `${baseUrl}/og-image.png`;

  const response = {
    type: 'action',
    icon: iconUrl,
    title: 'Cloak Private DCA',
    description:
      'Start a privacy-first Dollar Cost Average on Solana. Your USDC is shielded via zero-knowledge proofs before executing swaps through Jupiter — no on-chain link between your wallet and your accumulation strategy.',
    label: 'Start DCA',
    links: {
      actions: [
        {
          type: 'transaction',
          label: 'Start Private DCA',
          href: `${baseUrl}/api/actions/dca?outputToken={outputToken}&amount={amount}&amountPerTrade={amountPerTrade}&frequency={frequency}`,
          parameters: [
            {
              name: 'outputToken',
              label: 'Buy Token',
              type: 'select',
              required: true,
              options: SUPPORTED_OUTPUT_TOKENS.map((t) => ({
                label: t.symbol,
                value: t.mint,
              })),
            },
            {
              name: 'amount',
              label: 'Total USDC Amount',
              type: 'number',
              required: true,
              min: 1,
              max: 10000,
            },
            {
              name: 'amountPerTrade',
              label: 'USDC Per Trade',
              type: 'number',
              required: true,
              min: 0.5,
              max: 5000,
            },
            {
              name: 'frequency',
              label: 'Frequency',
              type: 'select',
              required: true,
              options: FREQUENCY_OPTIONS.map((f) => ({
                label: f.label,
                value: f.value.toString(),
              })),
            },
          ],
        },
      ],
    },
  };

  return withActionCors(NextResponse.json(response));
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const userAccount = new PublicKey(body.account);

    const { searchParams } = new URL(request.url);
    const outputToken = searchParams.get('outputToken');
    const amount = parseFloat(searchParams.get('amount') || '0');
    const amountPerTrade = parseFloat(searchParams.get('amountPerTrade') || '0');
    const frequency = parseInt(searchParams.get('frequency') || '0', 10);

    // Validate parameters
    if (!outputToken || amount <= 0 || amountPerTrade <= 0 || frequency <= 0) {
      return withActionCors(
        NextResponse.json({ message: 'Invalid parameters' }, { status: 400 })
      );
    }

    if (amount < 1 || amount > 10000) {
      return withActionCors(
        NextResponse.json({ message: 'Amount must be between 1 and 10,000 USDC' }, { status: 400 })
      );
    }

    if (amountPerTrade > amount) {
      return withActionCors(
        NextResponse.json({ message: 'Amount per trade cannot exceed total amount' }, { status: 400 })
      );
    }

    const validOutputMints: string[] = SUPPORTED_OUTPUT_TOKENS.map((t) => t.mint);
    if (!validOutputMints.includes(outputToken)) {
      return withActionCors(
        NextResponse.json({ message: 'Invalid output token' }, { status: 400 })
      );
    }

    const validFrequencies = FREQUENCY_OPTIONS.map((f) => f.value);
    if (!validFrequencies.includes(frequency as (typeof validFrequencies)[number])) {
      return withActionCors(
        NextResponse.json({ message: 'Invalid frequency' }, { status: 400 })
      );
    }

    // Rate limit: max 5 pending Blink deposits per user
    const supabase = createServiceClient();
    const { count } = await supabase
      .from('blink_deposits')
      .select('*', { count: 'exact', head: true })
      .eq('user_wallet', userAccount.toBase58())
      .in('status', ['pending_confirmation', 'confirmed', 'processing']);

    if ((count || 0) >= 5) {
      return withActionCors(
        NextResponse.json(
          { message: 'Too many pending Blink DCAs. Please wait for existing ones to process.' },
          { status: 429 }
        )
      );
    }

    // Build transaction
    const connection = getConnection();
    const escrowPubkey = getEscrowPublicKey();
    const usdcMint = new PublicKey(USDC_MINT);
    const amountBaseUnits = Math.floor(amount * 1e6); // USDC has 6 decimals

    // Reference key: random pubkey for on-chain transaction lookup
    const referenceKeypair = Keypair.generate();
    const referenceKey = referenceKeypair.publicKey;

    const userAta = await getAssociatedTokenAddress(usdcMint, userAccount);
    const escrowAta = await getAssociatedTokenAddress(usdcMint, escrowPubkey);

    const transaction = new Transaction();
    transaction.feePayer = userAccount;

    const latestBlockhash = await connection.getLatestBlockhash('confirmed');
    transaction.recentBlockhash = latestBlockhash.blockhash;

    // Ensure escrow ATA exists
    const escrowAtaInfo = await connection.getAccountInfo(escrowAta);
    if (!escrowAtaInfo) {
      transaction.add(
        createAssociatedTokenAccountInstruction(
          userAccount,
          escrowAta,
          escrowPubkey,
          usdcMint
        )
      );
    }

    // USDC transfer with reference key for on-chain lookup
    const transferIx = createTransferCheckedInstruction(
      userAta,
      usdcMint,
      escrowAta,
      userAccount,
      amountBaseUnits,
      6
    );
    transferIx.keys.push({
      pubkey: referenceKey,
      isSigner: false,
      isWritable: false,
    });
    transaction.add(transferIx);

    // Store pending deposit in database
    const { error: insertError } = await supabase.from('blink_deposits').insert({
      user_wallet: userAccount.toBase58(),
      escrow_wallet: escrowPubkey.toBase58(),
      amount,
      output_token: outputToken,
      frequency_hours: frequency,
      amount_per_trade: amountPerTrade,
      reference_key: referenceKey.toBase58(),
      status: 'pending_confirmation',
    });

    if (insertError) {
      console.error('Error storing blink deposit:', insertError);
      return withActionCors(
        NextResponse.json({ message: 'Failed to create deposit record' }, { status: 500 })
      );
    }

    // Serialize transaction
    const serialized = transaction.serialize({
      requireAllSignatures: false,
      verifySignatures: false,
    });

    const outputTokenInfo = SUPPORTED_OUTPUT_TOKENS.find((t) => t.mint === outputToken);
    const frequencyInfo = FREQUENCY_OPTIONS.find((f) => f.value === frequency);

    return withActionCors(
      NextResponse.json({
        type: 'transaction',
        transaction: serialized.toString('base64'),
        message: `Starting private DCA: ${amount} USDC → ${outputTokenInfo?.symbol || 'tokens'}, ${amountPerTrade} USDC per trade, ${frequencyInfo?.label.toLowerCase() || 'periodically'}. Funds are shielded via zero-knowledge proofs.`,
      })
    );
  } catch (error) {
    console.error('Blink action POST error:', error);
    return withActionCors(
      NextResponse.json({ message: 'Failed to create transaction' }, { status: 500 })
    );
  }
}
