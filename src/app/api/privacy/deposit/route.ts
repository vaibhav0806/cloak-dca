import { NextRequest, NextResponse } from 'next/server';
import { createServerPrivacyClient } from '@/lib/privacy/server';
import { USDC_MINT, SOL_MINT } from '@/lib/solana/constants';

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

    // Initialize Privacy Cash client
    const privacyClient = await createServerPrivacyClient(rpcUrl, sessionKeypairBase64);

    let result;

    if (tokenMint === SOL_MINT) {
      const lamports = Math.floor(amount * 1e9);
      result = await privacyClient.depositSOL(lamports);
    } else if (tokenMint === USDC_MINT) {
      const baseUnits = Math.floor(amount * 1e6);
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
