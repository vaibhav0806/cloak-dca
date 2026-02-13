import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';

/**
 * POST /api/beta/verify - Redeem a beta invite code
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

    // Check if the code exists and is unused
    const { data: betaCode, error: fetchError } = await supabase
      .from('beta_codes')
      .select('id, code, used_by')
      .eq('code', normalizedCode)
      .single();

    if (fetchError || !betaCode) {
      return NextResponse.json(
        { error: 'Invalid invite code' },
        { status: 400 }
      );
    }

    if (betaCode.used_by) {
      return NextResponse.json(
        { error: 'This code has already been used' },
        { status: 400 }
      );
    }

    // Mark the code as used
    const { error: updateCodeError } = await supabase
      .from('beta_codes')
      .update({ used_by: walletAddress })
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
