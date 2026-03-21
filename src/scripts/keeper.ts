import { createClient } from '@supabase/supabase-js';
import { Connection } from '@solana/web3.js';
import { executeKeeperDCAs } from '@/lib/keeper/execute';

async function main() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;
  const rpcUrl = process.env.NEXT_PUBLIC_HELIUS_RPC_URL || 'https://api.devnet.solana.com';

  if (!supabaseUrl || !supabaseServiceKey) {
    console.error('[Keeper] Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_KEY');
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey);
  const connection = new Connection(rpcUrl, {
    commitment: 'confirmed',
    confirmTransactionInitialTimeout: 60000,
  });

  console.log(`[Keeper] Starting execution at ${new Date().toISOString()}`);

  const result = await executeKeeperDCAs(supabase, connection, rpcUrl);

  console.log(`[Keeper] Complete: ${result.executed} DCAs processed`);
  console.log(JSON.stringify(result, null, 2));

  process.exit(0);
}

main().catch((error) => {
  console.error('[Keeper] Fatal error:', error);
  process.exit(1);
});
