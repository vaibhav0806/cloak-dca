import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import { ensureGrailUser } from '@/lib/grail/users';

/**
 * Devnet faucet for GRAIL USDC.
 *
 * GRAIL's devnet automatically mints 1,000,000 USDC to a user's wallet
 * when their account is created via createUser(). This endpoint triggers
 * that flow by ensuring the GRAIL user exists for the given session wallet.
 *
 * POST /api/grail/faucet
 * Headers: x-wallet-address (main wallet)
 *          x-session-wallet (session wallet — receives the GRAIL USDC)
 */
export async function POST(request: NextRequest) {
  try {
    const walletAddress = request.headers.get('x-wallet-address');
    const sessionWallet = request.headers.get('x-session-wallet');

    if (!walletAddress || !sessionWallet) {
      return NextResponse.json(
        { error: 'Missing x-wallet-address or x-session-wallet header' },
        { status: 400 }
      );
    }

    const supabase = createServiceClient();

    // Look up user
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id, grail_user_id')
      .eq('wallet_address', walletAddress)
      .single();

    if (userError || !user) {
      return NextResponse.json(
        { error: 'User not found. Create a DCA strategy first.' },
        { status: 404 }
      );
    }

    if (user.grail_user_id) {
      return NextResponse.json({
        message: 'GRAIL user already exists. USDC was minted on initial creation.',
        grailUserId: user.grail_user_id,
        alreadyCreated: true,
      });
    }

    // Create GRAIL user — this triggers the automatic 1M USDC devnet airdrop
    const grailUserId = await ensureGrailUser(user.id, sessionWallet, supabase);

    return NextResponse.json({
      message: 'GRAIL user created. 1,000,000 devnet USDC minted to session wallet.',
      grailUserId,
      alreadyCreated: false,
    });
  } catch (error) {
    console.error('Faucet error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Faucet failed' },
      { status: 500 }
    );
  }
}
