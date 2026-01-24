import { NextRequest, NextResponse } from 'next/server';
import { createServerPrivacyClient, getTokenBalance } from '@/lib/privacy/server';
import { SUPPORTED_INPUT_TOKENS, SUPPORTED_OUTPUT_TOKENS } from '@/lib/solana/constants';
import type { ShieldedBalance } from '@/types';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { sessionKeypairBase64, tokenMints } = body;

    if (!sessionKeypairBase64) {
      return NextResponse.json(
        { error: 'Session keypair required' },
        { status: 400 }
      );
    }

    const rpcUrl = process.env.NEXT_PUBLIC_HELIUS_RPC_URL || 'https://api.devnet.solana.com';

    // Initialize Privacy Cash client
    const privacyClient = await createServerPrivacyClient(rpcUrl, sessionKeypairBase64);

    // Get all unique tokens
    const allTokens = [...SUPPORTED_INPUT_TOKENS, ...SUPPORTED_OUTPUT_TOKENS];
    const tokenMap = new Map<string, typeof allTokens[0]>(allTokens.map(t => [t.mint, t]));

    // If specific mints requested, filter to those
    const mintsToCheck: string[] = tokenMints?.length > 0
      ? (tokenMints as string[]).filter((mint) => tokenMap.has(mint))
      : Array.from(tokenMap.keys());

    const balances: ShieldedBalance[] = [];

    for (const mint of mintsToCheck) {
      const token = tokenMap.get(mint);
      if (!token) continue;

      try {
        const { amount } = await getTokenBalance(privacyClient, mint);
        // Calculate USD value (USDC/USDT = $1, SOL would need price feed)
        let usdValue = 0;
        if (token.symbol === 'USDC' || token.symbol === 'USDT') {
          usdValue = amount; // Stablecoins are 1:1 with USD
        }
        // For other tokens like SOL, we'd need a price feed - skip for now
        balances.push({ token, amount, usdValue });
      } catch (error) {
        console.error(`Error fetching balance for ${token.symbol}:`, error);
        balances.push({ token, amount: 0, usdValue: 0 });
      }
    }

    return NextResponse.json({ balances });
  } catch (error) {
    console.error('Error in balance endpoint:', error);
    return NextResponse.json(
      { error: 'Failed to fetch balances' },
      { status: 500 }
    );
  }
}
