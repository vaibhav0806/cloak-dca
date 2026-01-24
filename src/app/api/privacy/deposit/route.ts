import { NextRequest, NextResponse } from 'next/server';
import { createServerPrivacyClient } from '@/lib/privacy/server';
import { USDC_MINT, SOL_MINT } from '@/lib/solana/constants';
import { Connection, PublicKey, Keypair } from '@solana/web3.js';
import { getAssociatedTokenAddress } from '@solana/spl-token';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { sessionKeypairBase64, tokenMint, amount } = body;

    if (!sessionKeypairBase64) {
      return NextResponse.json(
        { error: 'Session keypair required' },
        { status: 400 }
      );
    }

    if (!tokenMint || !amount || amount <= 0) {
      return NextResponse.json(
        { error: 'Token mint and positive amount required' },
        { status: 400 }
      );
    }

    const rpcUrl = process.env.NEXT_PUBLIC_HELIUS_RPC_URL || 'https://api.devnet.solana.com';

    // Pre-flight check: verify session wallet has funds
    const secretKey = Buffer.from(sessionKeypairBase64, 'base64');
    const keypair = Keypair.fromSecretKey(secretKey);
    const connection = new Connection(rpcUrl);

    // Check SOL balance for fees
    const solBalance = await connection.getBalance(keypair.publicKey);
    console.log(`Session wallet SOL balance: ${solBalance / 1e9} SOL`);

    if (solBalance < 0.005 * 1e9) {
      return NextResponse.json(
        { error: `Insufficient SOL for transaction fees. Have ${(solBalance / 1e9).toFixed(4)} SOL, need at least 0.005 SOL` },
        { status: 400 }
      );
    }

    // If depositing USDC, check USDC balance
    if (tokenMint === USDC_MINT) {
      const usdcMint = new PublicKey(USDC_MINT);
      const ata = await getAssociatedTokenAddress(usdcMint, keypair.publicKey);
      const accountInfo = await connection.getAccountInfo(ata);

      if (!accountInfo) {
        return NextResponse.json(
          { error: 'No USDC token account found in session wallet. Please transfer USDC first.' },
          { status: 400 }
        );
      }

      const usdcBalance = accountInfo.data.readBigUInt64LE(64);
      const usdcAmount = Number(usdcBalance) / 1e6;
      console.log(`Session wallet USDC balance: ${usdcAmount} USDC`);

      if (usdcAmount < amount) {
        return NextResponse.json(
          { error: `Insufficient USDC. Have ${usdcAmount.toFixed(2)} USDC, trying to deposit ${amount} USDC` },
          { status: 400 }
        );
      }
    }

    // Initialize Privacy Cash client
    const privacyClient = await createServerPrivacyClient(rpcUrl, sessionKeypairBase64);

    let result;

    if (tokenMint === SOL_MINT) {
      const lamports = Math.floor(amount * 1e9);
      result = await privacyClient.depositSOL(lamports);
    } else if (tokenMint === USDC_MINT) {
      const baseUnits = Math.floor(amount * 1e6);
      console.log(`Starting deposit of ${baseUnits} USDC base units (${amount} USDC)`);
      result = await privacyClient.depositUSDC(baseUnits);
    } else {
      const baseUnits = Math.floor(amount * 1e6); // Assume 6 decimals for other SPL
      result = await privacyClient.depositSPL(tokenMint, baseUnits);
    }

    return NextResponse.json({ signature: result.tx });
  } catch (error) {
    console.error('Error in deposit endpoint:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Deposit failed' },
      { status: 500 }
    );
  }
}
