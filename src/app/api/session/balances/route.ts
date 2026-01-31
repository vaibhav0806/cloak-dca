import { NextRequest, NextResponse } from 'next/server';
import { Connection, PublicKey, LAMPORTS_PER_SOL } from '@solana/web3.js';
import { getAssociatedTokenAddress } from '@solana/spl-token';
import { SUPPORTED_OUTPUT_TOKENS, TOKENS } from '@/lib/solana/constants';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { sessionPublicKey } = body;

    if (!sessionPublicKey) {
      return NextResponse.json(
        { error: 'Session public key required' },
        { status: 400 }
      );
    }

    const rpcUrl = process.env.NEXT_PUBLIC_HELIUS_RPC_URL || 'https://api.devnet.solana.com';
    const connection = new Connection(rpcUrl, 'confirmed');
    const sessionPubkey = new PublicKey(sessionPublicKey);

    const balances: Array<{
      token: typeof SUPPORTED_OUTPUT_TOKENS[0];
      amount: number;
      usdValue: number;
    }> = [];

    // Check SOL balance (native)
    try {
      const solBalance = await connection.getBalance(sessionPubkey);
      const solAmount = solBalance / LAMPORTS_PER_SOL;
      // Reserve 0.01 SOL for gas, show only withdrawable amount
      const withdrawableSOL = Math.max(0, solAmount - 0.01);
      if (withdrawableSOL > 0.0001) {
        balances.push({
          token: TOKENS.SOL,
          amount: withdrawableSOL,
          usdValue: 0, // Would need price feed
        });
      }
    } catch (error) {
      console.error('Error fetching SOL balance:', error);
    }

    // Check SPL token balances (cbBTC, ZEC)
    for (const token of SUPPORTED_OUTPUT_TOKENS) {
      if (token.mint === TOKENS.SOL.mint) continue; // Skip SOL, already handled

      try {
        const mint = new PublicKey(token.mint);
        const ata = await getAssociatedTokenAddress(mint, sessionPubkey);
        const accountInfo = await connection.getAccountInfo(ata);

        if (accountInfo) {
          const data = accountInfo.data;
          const rawBalance = data.readBigUInt64LE(64);
          const amount = Number(rawBalance) / Math.pow(10, token.decimals);

          // Only show if above dust threshold (0.0001) to avoid displaying "0.00"
          if (amount > 0.0001) {
            balances.push({
              token,
              amount,
              usdValue: 0, // Would need price feed
            });
          }
        }
      } catch (error) {
        // Token account doesn't exist or error - skip
        console.error(`Error fetching ${token.symbol} balance:`, error);
      }
    }

    return NextResponse.json({ balances });
  } catch (error) {
    console.error('Error in session balances endpoint:', error);
    return NextResponse.json(
      { error: 'Failed to fetch session balances' },
      { status: 500 }
    );
  }
}
