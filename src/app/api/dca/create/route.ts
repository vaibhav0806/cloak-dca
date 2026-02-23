import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import { isBetaApproved } from '@/lib/beta';
import { addHours } from 'date-fns';
import type { CreateDCAParams } from '@/types';

export async function POST(request: NextRequest) {
  try {
    let body: CreateDCAParams & { walletAddress: string; encryptedData?: string };
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: 'Invalid JSON body' },
        { status: 400 }
      );
    }

    const {
      inputToken,
      outputToken,
      totalAmount,
      amountPerTrade,
      frequencyHours,
      walletAddress,
      encryptedData,
    } = body;

    // Validate required fields
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

    // Validate numeric ranges
    if (typeof totalAmount !== 'number' || !Number.isFinite(totalAmount) || totalAmount <= 0) {
      return NextResponse.json(
        { error: 'Total amount must be a positive number' },
        { status: 400 }
      );
    }
    if (typeof amountPerTrade !== 'number' || !Number.isFinite(amountPerTrade) || amountPerTrade < 0.1) {
      return NextResponse.json(
        { error: 'Amount per trade must be at least 0.1' },
        { status: 400 }
      );
    }
    if (amountPerTrade > totalAmount) {
      return NextResponse.json(
        { error: 'Amount per trade cannot exceed total amount' },
        { status: 400 }
      );
    }
    if (typeof frequencyHours !== 'number' || !Number.isFinite(frequencyHours) || frequencyHours < 1 || frequencyHours > 8760) {
      return NextResponse.json(
        { error: 'Frequency must be between 1 and 8760 hours' },
        { status: 400 }
      );
    }
    if (inputToken.mint === outputToken.mint) {
      return NextResponse.json(
        { error: 'Input and output tokens must be different' },
        { status: 400 }
      );
    }

    if (!(await isBetaApproved(walletAddress))) {
      return NextResponse.json(
        { error: 'Beta access required' },
        { status: 403 }
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
