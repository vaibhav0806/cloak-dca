import { NextRequest, NextResponse } from 'next/server';
import { isBetaApproved } from '@/lib/beta';

/**
 * GET /api/beta/status - Check if a wallet is beta approved
 */
export async function GET(request: NextRequest) {
  try {
    const walletAddress = request.headers.get('x-wallet-address');

    if (!walletAddress) {
      return NextResponse.json(
        { error: 'Wallet address required' },
        { status: 400 }
      );
    }

    const approved = await isBetaApproved(walletAddress);

    return NextResponse.json({ approved });
  } catch (error) {
    console.error('Beta status error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
