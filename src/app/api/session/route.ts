import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';

/**
 * GET /api/session - Fetch stored session keypair for a wallet
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

    const supabase = createServiceClient();

    const { data: user, error } = await supabase
      .from('users')
      .select('session_keypair')
      .eq('wallet_address', walletAddress)
      .single();

    if (error && error.code !== 'PGRST116') {
      // PGRST116 = no rows returned, which is fine
      console.error('Error fetching session:', error);
      return NextResponse.json(
        { error: 'Failed to fetch session' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      sessionKeypair: user?.session_keypair || null,
    });
  } catch (error) {
    console.error('Session fetch error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/session - Store session keypair for a wallet
 */
export async function POST(request: NextRequest) {
  try {
    const walletAddress = request.headers.get('x-wallet-address');

    if (!walletAddress) {
      return NextResponse.json(
        { error: 'Wallet address required' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { sessionKeypairBase64 } = body;

    if (!sessionKeypairBase64) {
      return NextResponse.json(
        { error: 'Session keypair required' },
        { status: 400 }
      );
    }

    const supabase = createServiceClient();

    // Upsert user with session keypair
    const { error } = await supabase
      .from('users')
      .upsert(
        {
          wallet_address: walletAddress,
          session_keypair: sessionKeypairBase64,
        },
        {
          onConflict: 'wallet_address',
          ignoreDuplicates: false,
        }
      );

    if (error) {
      console.error('Error saving session:', error);
      return NextResponse.json(
        { error: 'Failed to save session' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Session save error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
