import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  try {
    const walletAddress = request.headers.get('x-wallet-address');

    if (!walletAddress) {
      return NextResponse.json(
        { error: 'Wallet address required' },
        { status: 401 }
      );
    }

    const supabase = createServiceClient();

    // Get user
    const { data: user } = await supabase
      .from('users')
      .select('id')
      .eq('wallet_address', walletAddress)
      .single();

    if (!user) {
      return NextResponse.json([]);
    }

    // Get DCA configs
    const { data: configs, error } = await supabase
      .from('dca_configs')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching DCA configs:', error);
      return NextResponse.json(
        { error: 'Failed to fetch DCA configurations' },
        { status: 500 }
      );
    }

    return NextResponse.json(configs || []);
  } catch (error) {
    console.error('Error in DCA list:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
