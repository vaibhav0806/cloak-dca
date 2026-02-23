import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import { SUPPORTED_OUTPUT_TOKENS, FREQUENCY_OPTIONS } from '@/lib/solana/constants';

/**
 * Public status endpoint for Blink deposits
 * Query by reference key or wallet address
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const ref = searchParams.get('ref');
  const wallet = searchParams.get('wallet');

  if (!ref && !wallet) {
    return NextResponse.json(
      { error: 'Provide either ref (reference key) or wallet (address) parameter' },
      { status: 400 }
    );
  }

  const supabase = createServiceClient();

  let query = supabase
    .from('blink_deposits')
    .select('id, user_wallet, amount, output_token, frequency_hours, amount_per_trade, status, dca_config_id, created_at, confirmed_at, processed_at, error_message');

  if (ref) {
    query = query.eq('reference_key', ref);
  } else if (wallet) {
    query = query.eq('user_wallet', wallet).order('created_at', { ascending: false }).limit(10);
  }

  const { data: deposits, error } = await query;

  if (error) {
    console.error('Error fetching blink status:', error);
    return NextResponse.json({ error: 'Failed to fetch status' }, { status: 500 });
  }

  if (!deposits || deposits.length === 0) {
    return NextResponse.json({ error: 'No deposits found' }, { status: 404 });
  }

  // Enrich with DCA progress for processed deposits
  const enriched = await Promise.all(
    deposits.map(async (deposit) => {
      const outputToken = SUPPORTED_OUTPUT_TOKENS.find(
        (t) => t.mint === deposit.output_token
      );
      const frequency = FREQUENCY_OPTIONS.find(
        (f) => f.value === deposit.frequency_hours
      );

      let dcaProgress = null;
      if (deposit.dca_config_id) {
        const { data: dca } = await supabase
          .from('dca_configs')
          .select('completed_trades, total_trades, status, next_execution')
          .eq('id', deposit.dca_config_id)
          .single();

        if (dca) {
          dcaProgress = {
            completed_trades: dca.completed_trades,
            total_trades: dca.total_trades,
            status: dca.status,
            next_execution: dca.next_execution,
          };
        }
      }

      return {
        id: deposit.id,
        status: deposit.status,
        amount: deposit.amount,
        amount_per_trade: deposit.amount_per_trade,
        output_token: outputToken?.symbol || deposit.output_token,
        frequency: frequency?.label || `Every ${deposit.frequency_hours}h`,
        created_at: deposit.created_at,
        confirmed_at: deposit.confirmed_at,
        processed_at: deposit.processed_at,
        error_message: deposit.error_message,
        dca: dcaProgress,
      };
    })
  );

  return NextResponse.json(ref ? enriched[0] : enriched);
}
