import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import { getConnection } from '@/lib/solana/connection';
import { executeKeeperDCAs } from '@/lib/keeper/execute';

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;

    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = createServiceClient();
    const connection = getConnection();
    const rpcUrl = process.env.NEXT_PUBLIC_HELIUS_RPC_URL || 'https://api.devnet.solana.com';

    const result = await executeKeeperDCAs(supabase, connection, rpcUrl);
    return NextResponse.json(result);
  } catch (error) {
    console.error('Keeper execution error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
