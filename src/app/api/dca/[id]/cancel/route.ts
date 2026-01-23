import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const walletAddress = request.headers.get('x-wallet-address');

    if (!walletAddress) {
      return NextResponse.json(
        { error: 'Wallet address required' },
        { status: 401 }
      );
    }

    const supabase = createServiceClient();

    // Verify ownership
    const { data: user } = await supabase
      .from('users')
      .select('id')
      .eq('wallet_address', walletAddress)
      .single();

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    const { data: config } = await supabase
      .from('dca_configs')
      .select('user_id, status')
      .eq('id', id)
      .single();

    if (!config || config.user_id !== user.id) {
      return NextResponse.json(
        { error: 'DCA configuration not found' },
        { status: 404 }
      );
    }

    if (config.status === 'completed' || config.status === 'cancelled') {
      return NextResponse.json(
        { error: 'Cannot cancel completed or already cancelled DCAs' },
        { status: 400 }
      );
    }

    // Update status
    const { error } = await supabase
      .from('dca_configs')
      .update({ status: 'cancelled', updated_at: new Date().toISOString() })
      .eq('id', id);

    if (error) {
      console.error('Error cancelling DCA:', error);
      return NextResponse.json(
        { error: 'Failed to cancel DCA' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in DCA cancel:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
