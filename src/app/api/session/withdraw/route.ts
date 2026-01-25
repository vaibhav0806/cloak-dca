import { NextRequest, NextResponse } from 'next/server';
import {
  Connection,
  PublicKey,
  Keypair,
  Transaction,
  SystemProgram,
  LAMPORTS_PER_SOL,
  sendAndConfirmTransaction
} from '@solana/web3.js';
import {
  getAssociatedTokenAddress,
  createTransferInstruction,
  createAssociatedTokenAccountInstruction,
  getAccount,
  TokenAccountNotFoundError
} from '@solana/spl-token';
import { TOKENS } from '@/lib/solana/constants';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { walletAddress, tokenMint, amount } = body;

    if (!walletAddress || !tokenMint || !amount) {
      return NextResponse.json(
        { error: 'Wallet address, token mint, and amount required' },
        { status: 400 }
      );
    }

    // Get session keypair from database
    const { data: sessionData, error: sessionError } = await supabase
      .from('user_sessions')
      .select('session_keypair')
      .eq('wallet_address', walletAddress)
      .single();

    if (sessionError || !sessionData?.session_keypair) {
      return NextResponse.json(
        { error: 'Session not found' },
        { status: 404 }
      );
    }

    // Decode session keypair
    const binaryString = atob(sessionData.session_keypair);
    const secretKey = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      secretKey[i] = binaryString.charCodeAt(i);
    }
    const sessionKeypair = Keypair.fromSecretKey(secretKey);

    const rpcUrl = process.env.NEXT_PUBLIC_HELIUS_RPC_URL || 'https://api.devnet.solana.com';
    const connection = new Connection(rpcUrl, 'confirmed');
    const destinationPubkey = new PublicKey(walletAddress);

    // Find token info
    const token = Object.values(TOKENS).find(t => t.mint === tokenMint);
    if (!token) {
      return NextResponse.json(
        { error: 'Unknown token' },
        { status: 400 }
      );
    }

    const transaction = new Transaction();
    let signature: string;

    if (tokenMint === TOKENS.SOL.mint) {
      // Transfer native SOL
      const lamports = Math.floor(amount * LAMPORTS_PER_SOL);

      transaction.add(
        SystemProgram.transfer({
          fromPubkey: sessionKeypair.publicKey,
          toPubkey: destinationPubkey,
          lamports,
        })
      );
    } else {
      // Transfer SPL token
      const mint = new PublicKey(tokenMint);
      const sourceAta = await getAssociatedTokenAddress(mint, sessionKeypair.publicKey);
      const destAta = await getAssociatedTokenAddress(mint, destinationPubkey);

      // Check if destination ATA exists, create if not
      try {
        await getAccount(connection, destAta);
      } catch (error) {
        if (error instanceof TokenAccountNotFoundError) {
          transaction.add(
            createAssociatedTokenAccountInstruction(
              sessionKeypair.publicKey, // payer
              destAta,
              destinationPubkey,
              mint
            )
          );
        } else {
          throw error;
        }
      }

      const rawAmount = Math.floor(amount * Math.pow(10, token.decimals));
      transaction.add(
        createTransferInstruction(
          sourceAta,
          destAta,
          sessionKeypair.publicKey,
          rawAmount
        )
      );
    }

    // Send transaction
    const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash();
    transaction.recentBlockhash = blockhash;
    transaction.feePayer = sessionKeypair.publicKey;

    signature = await sendAndConfirmTransaction(
      connection,
      transaction,
      [sessionKeypair],
      { commitment: 'confirmed' }
    );

    return NextResponse.json({
      success: true,
      signature,
      amount,
      token: token.symbol
    });
  } catch (error) {
    console.error('Error in session withdraw endpoint:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to withdraw' },
      { status: 500 }
    );
  }
}
