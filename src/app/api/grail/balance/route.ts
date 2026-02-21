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

    // Look up user and their GRAIL user ID
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('grail_user_id')
      .eq('wallet_address', walletAddress)
      .single();

    if (userError || !user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    if (!user.grail_user_id) {
      return NextResponse.json({
        goldAmount: 0,
        usdValue: 0,
        goldPricePerOunce: 0,
      });
    }

    // Get user's gold balance from GRAIL
    const [grailUser, priceData] = await Promise.all([
      grailService.getUser(user.grail_user_id),
      grailService.getGoldPrice(),
    ]);

    const goldAmount = grailUser.goldBalance || 0;
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
