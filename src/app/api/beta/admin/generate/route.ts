import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';

// Alphanumeric chars excluding ambiguous ones (0/O, 1/I/L)
const CHARS = '23456789ABCDEFGHJKMNPQRSTUVWXYZ';

function generateCode(): string {
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += CHARS[Math.floor(Math.random() * CHARS.length)];
  }
  return code;
}

/**
 * POST /api/beta/admin/generate - Generate a beta invite code for a specific wallet
 * Secured by BETA_ADMIN_SECRET header
 * Body: { walletAddress: string }
 */
export async function POST(request: NextRequest) {
  try {
    const adminSecret = request.headers.get('x-admin-secret');
    const expectedSecret = process.env.BETA_ADMIN_SECRET;

    if (!expectedSecret || adminSecret !== expectedSecret) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json().catch(() => ({}));
    const { walletAddress } = body;

    if (!walletAddress) {
      return NextResponse.json(
        { error: 'walletAddress is required' },
        { status: 400 }
      );
    }

    const supabase = createServiceClient();

    // Check if a code already exists for this wallet
    const { data: existing } = await supabase
      .from('beta_codes')
      .select('code, redeemed')
      .eq('wallet_address', walletAddress)
      .single();

    if (existing) {
      return NextResponse.json({
        code: existing.code,
        walletAddress,
        alreadyExists: true,
        redeemed: existing.redeemed,
      });
    }

    // Generate a unique code
    let code: string;
    let attempts = 0;

    do {
      code = generateCode();
      attempts++;

      const { error } = await supabase
        .from('beta_codes')
        .insert({ code, wallet_address: walletAddress });

      if (!error) {
        return NextResponse.json({ code, walletAddress });
      }

      // If duplicate code (unlikely), retry
      if (error.code !== '23505') {
        console.error('Error inserting beta code:', error);
        return NextResponse.json(
          { error: 'Failed to generate code' },
          { status: 500 }
        );
      }
    } while (attempts < 10);

    return NextResponse.json(
      { error: 'Failed to generate unique code after multiple attempts' },
      { status: 500 }
    );
  } catch (error) {
    console.error('Beta admin generate error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
