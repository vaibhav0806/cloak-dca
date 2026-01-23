import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import { addHours } from 'date-fns';
import type { CreateDCAParams } from '@/types';

export async function POST(request: NextRequest) {
  try {
    const body: CreateDCAParams & { walletAddress: string; encryptedData?: string } =
      await request.json();

    const {
      inputToken,
      outputToken,
      totalAmount,
      amountPerTrade,
      frequencyHours,
      walletAddress,
      encryptedData,
    } = body;

    // Validate input
    if (!inputToken || !outputToken || !totalAmount || !amountPerTrade || !frequencyHours) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    if (!walletAddress) {
      return NextResponse.json(
        { error: 'Wallet address required' },
        { status: 401 }
      );
    }

    const totalTrades = Math.ceil(totalAmount / amountPerTrade);
    const nextExecution = addHours(new Date(), frequencyHours);

    const supabase = createServiceClient();

    // Find or create user
    let { data: user } = await supabase
      .from('users')
      .select('id')
      .eq('wallet_address', walletAddress)
      .single();

    if (!user) {
      const { data: newUser, error: userError } = await supabase
        .from('users')
        .insert({ wallet_address: walletAddress })
        .select('id')
        .single();

      if (userError) {
        console.error('Error creating user:', userError);
        return NextResponse.json(
          { error: 'Failed to create user' },
          { status: 500 }
        );
      }
      user = newUser;
    }

    // Create DCA config
    const { data: dcaConfig, error: dcaError } = await supabase
      .from('dca_configs')
      .insert({
        user_id: user.id,
        input_token: inputToken.mint,
        output_token: outputToken.mint,
        total_amount: totalAmount,
        amount_per_trade: amountPerTrade,
        frequency_hours: frequencyHours,
        total_trades: totalTrades,
        completed_trades: 0,
        status: 'active',
        encrypted_data: encryptedData || null,
        next_execution: nextExecution.toISOString(),
      })
      .select()
      .single();

    if (dcaError) {
      console.error('Error creating DCA config:', dcaError);
      return NextResponse.json(
        { error: 'Failed to create DCA configuration' },
        { status: 500 }
      );
    }

    return NextResponse.json(dcaConfig);
  } catch (error) {
    console.error('Error in DCA create:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
