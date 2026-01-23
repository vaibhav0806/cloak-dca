import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: dcaConfigId } = await params;
    const walletAddress = request.headers.get('x-wallet-address');

    if (!walletAddress) {
      return NextResponse.json(
        { error: 'Wallet address required' },
        { status: 401 }
      );
    }

    const supabase = createServiceClient();

    // First verify the DCA config belongs to this wallet
    const { data: dcaConfig, error: configError } = await supabase
      .from('dca_configs')
      .select(`
        id,
        user_id,
        users!inner(wallet_address)
      `)
      .eq('id', dcaConfigId)
      .single();

    if (configError || !dcaConfig) {
      return NextResponse.json(
        { error: 'DCA configuration not found' },
        { status: 404 }
      );
    }

    // Verify ownership
    const users = dcaConfig.users as unknown as { wallet_address: string } | { wallet_address: string }[];
    const user = Array.isArray(users) ? users[0] : users;
    if (!user || user.wallet_address.toLowerCase() !== walletAddress.toLowerCase()) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      );
    }

    // Fetch executions for this DCA config
    const { data: executions, error: executionsError } = await supabase
      .from('executions')
      .select('*')
      .eq('dca_config_id', dcaConfigId)
      .order('trade_number', { ascending: false });

    if (executionsError) {
      console.error('Error fetching executions:', executionsError);
      return NextResponse.json(
        { error: 'Failed to fetch executions' },
        { status: 500 }
      );
    }

    return NextResponse.json({ executions: executions || [] });
  } catch (error) {
    console.error('Error in executions endpoint:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
