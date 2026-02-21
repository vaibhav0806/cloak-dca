import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import { grailService } from '@/lib/grail';

export async function GET(request: NextRequest) {
  try {
    const walletAddress = request.headers.get('x-wallet-address');
    if (!walletAddress) {
      return NextResponse.json(
        { error: 'Missing x-wallet-address header' },
        { status: 400 }
      );
    }

    const supabase = createServiceClient();

    // Look up user
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id')
      .eq('wallet_address', walletAddress)
      .single();

    if (userError || !user) {
      return NextResponse.json({
        goldAmount: 0,
        usdValue: 0,
        goldPricePerOunce: 0,
      });
    }

    // Calculate gold balance from successful executions (partner purchase model)
    const { data: executions } = await supabase
      .from('executions')
      .select('gold_amount, dca_config_id, dca_configs!inner(user_id)')
      .eq('dca_configs.user_id', user.id)
      .eq('status', 'success')
      .not('gold_amount', 'is', null);

    const goldAmount = (executions || []).reduce(
      (sum, e) => sum + (Number(e.gold_amount) || 0),
      0
    );

    if (goldAmount === 0) {
      return NextResponse.json({
        goldAmount: 0,
        usdValue: 0,
        goldPricePerOunce: 0,
      });
    }

    // Get current gold price for USD valuation
    const priceData = await grailService.getGoldPrice();
    const goldPricePerOunce = priceData.price;
    const usdValue = goldAmount * goldPricePerOunce;

    return NextResponse.json({
      goldAmount,
      usdValue,
      goldPricePerOunce,
    });
  } catch (error) {
    console.error('Error fetching gold balance:', error);
    return NextResponse.json(
      { error: 'Failed to fetch gold balance' },
      { status: 500 }
    );
  }
}
