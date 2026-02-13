import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';

/**
 * POST /api/beta/verify - Redeem a beta invite code
 * The code must have been generated for the wallet trying to redeem it.
 */
export async function POST(request: NextRequest) {
  try {
    const { code, walletAddress } = await request.json();

    if (!code || !walletAddress) {
      return NextResponse.json(
        { error: 'Code and wallet address are required' },
        { status: 400 }
      );
    }

    const normalizedCode = code.toUpperCase().trim();

    const supabase = createServiceClient();

    // Look up the code and verify it belongs to this wallet
    const { data: betaCode, error: fetchError } = await supabase
      .from('beta_codes')
      .select('id, code, wallet_address, redeemed')
      .eq('code', normalizedCode)
      .single();

    if (fetchError || !betaCode) {
      return NextResponse.json(
        { error: 'Invalid invite code' },
        { status: 400 }
      );
    }

    if (betaCode.wallet_address !== walletAddress) {
      return NextResponse.json(
        { error: 'This code is not valid for your wallet' },
        { status: 400 }
      );
    }

    if (betaCode.redeemed) {
      return NextResponse.json(
        { error: 'This code has already been redeemed' },
        { status: 400 }
      );
    }

    // Mark the code as redeemed
    const { error: updateCodeError } = await supabase
      .from('beta_codes')
      .update({ redeemed: true })
      .eq('id', betaCode.id);

    if (updateCodeError) {
      console.error('Error updating beta code:', updateCodeError);
      return NextResponse.json(
        { error: 'Failed to redeem code' },
        { status: 500 }
      );
    }

    // Upsert user with beta_approved = true
    const { error: upsertError } = await supabase
      .from('users')
      .upsert(
        {
          wallet_address: walletAddress,
          beta_approved: true,
        },
        {
          onConflict: 'wallet_address',
          ignoreDuplicates: false,
        }
      );

    if (upsertError) {
      console.error('Error approving user:', upsertError);
      return NextResponse.json(
        { error: 'Failed to approve user' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Beta verify error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
