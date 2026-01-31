import { NextRequest, NextResponse } from 'next/server';
import {
  Connection,
  PublicKey,
  Keypair,
  Transaction,
  SystemProgram,
  LAMPORTS_PER_SOL,
} from '@solana/web3.js';
import {
  getAssociatedTokenAddress,
  createTransferInstruction,
  createAssociatedTokenAccountInstruction,
  getAccount,
  TokenAccountNotFoundError
} from '@solana/spl-token';
import { TOKENS } from '@/lib/solana/constants';

/**
 * Confirm a transaction using polling instead of WebSocket subscriptions
 * This works in serverless environments where WebSockets are not supported
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

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { walletAddress, tokenMint, amount, sessionKeypairBase64 } = body;

    if (!walletAddress || !tokenMint || !amount || !sessionKeypairBase64) {
      return NextResponse.json(
        { error: 'Wallet address, token mint, amount, and session keypair required' },
        { status: 400 }
      );
    }

    // Decode session keypair from base64
    const secretKey = Buffer.from(sessionKeypairBase64, 'base64');
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

    // Send transaction using polling-based confirmation (works in serverless)
    const { blockhash } = await connection.getLatestBlockhash();
    transaction.recentBlockhash = blockhash;
    transaction.feePayer = sessionKeypair.publicKey;
    transaction.sign(sessionKeypair);

    signature = await connection.sendRawTransaction(transaction.serialize(), {
      skipPreflight: false,
      preflightCommitment: 'confirmed',
    });

    console.log(`Withdraw tx sent: ${signature}`);

    // Confirm using polling instead of WebSocket subscription
    await confirmTransactionPolling(connection, signature, 30, 1000);
    console.log(`Withdraw tx confirmed: ${signature}`);

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
