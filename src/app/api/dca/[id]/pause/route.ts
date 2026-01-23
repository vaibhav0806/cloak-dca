import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';

interface RouteParams {
  params: Promise<{ id: string }>;
}

// Pause DCA
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

    if (config.status !== 'active') {
      return NextResponse.json(
        { error: 'Can only pause active DCAs' },
        { status: 400 }
      );
    }

    // Update status
    const { error } = await supabase
      .from('dca_configs')
      .update({ status: 'paused', updated_at: new Date().toISOString() })
      .eq('id', id);

    if (error) {
      console.error('Error pausing DCA:', error);
      return NextResponse.json(
        { error: 'Failed to pause DCA' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in DCA pause:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Resume DCA
export async function DELETE(request: NextRequest, { params }: RouteParams) {
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

    if (config.status !== 'paused') {
      return NextResponse.json(
        { error: 'Can only resume paused DCAs' },
        { status: 400 }
      );
    }

    // Update status
    const { error } = await supabase
      .from('dca_configs')
      .update({ status: 'active', updated_at: new Date().toISOString() })
      .eq('id', id);

    if (error) {
      console.error('Error resuming DCA:', error);
      return NextResponse.json(
        { error: 'Failed to resume DCA' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in DCA resume:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
