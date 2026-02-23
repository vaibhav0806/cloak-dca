import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import { executeGrailSale } from '@/lib/grail/execute';

export async function POST(request: NextRequest) {
  try {
    const walletAddress = request.headers.get('x-wallet-address');
    if (!walletAddress) {
      return NextResponse.json(
        { error: 'Missing x-wallet-address header' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { goldAmount } = body;

    if (!goldAmount || goldAmount <= 0) {
      return NextResponse.json(
        { error: 'goldAmount must be a positive number' },
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
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Verify user has enough gold (from executions DB + any prior sales)
    const { data: buyExecutions } = await supabase
      .from('executions')
      .select('gold_amount, dca_config_id, dca_configs!inner(user_id)')
      .eq('dca_configs.user_id', user.id)
      .eq('status', 'success')
      .not('gold_amount', 'is', null);

    const totalGoldBought = (buyExecutions || []).reduce(
      (sum, e) => sum + (Number(e.gold_amount) || 0),
      0
    );

    // Check for prior sales (gold_sold records)
    const { data: sellRecords } = await supabase
      .from('gold_sales')
      .select('gold_amount')
      .eq('user_id', user.id)
      .eq('status', 'success');

    const totalGoldSold = (sellRecords || []).reduce(
      (sum, e) => sum + (Number(e.gold_amount) || 0),
      0
    );

    const availableGold = totalGoldBought - totalGoldSold;

    if (goldAmount > availableGold + 0.000001) { // tiny epsilon for float precision
      return NextResponse.json(
        { error: `Insufficient gold. Have ${availableGold.toFixed(6)} oz, trying to sell ${goldAmount.toFixed(6)} oz` },
        { status: 400 }
      );
    }

    // Execute the sale
    const result = await executeGrailSale({ goldAmount });

    // Record the sale (table may not exist yet — don't fail the response)
    const { error: insertError } = await supabase.from('gold_sales').insert({
      user_id: user.id,
      gold_amount: result.goldSold,
      usdc_received: result.usdcReceived,
      gold_price_at_sale: result.goldPrice,
      tx_signature: result.txId,
      status: 'success',
    });
    if (insertError) {
      console.warn('Failed to record sale in gold_sales table:', insertError.message);
    }

    return NextResponse.json({
      txId: result.txId,
      goldSold: result.goldSold,
      usdcReceived: result.usdcReceived,
      goldPrice: result.goldPrice,
    });
  } catch (error) {
    console.error('Error selling gold:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to sell gold' },
      { status: 500 }
    );
  }
}
