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
 * POST /api/beta/admin/generate - Generate beta invite codes
 * Secured by BETA_ADMIN_SECRET header
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
    const count = Math.min(Math.max(body.count || 1, 1), 50); // 1-50 codes at a time

    const supabase = createServiceClient();
    const codes: string[] = [];

    for (let i = 0; i < count; i++) {
      let code: string;
      let attempts = 0;

      // Retry to ensure uniqueness
      do {
        code = generateCode();
        attempts++;
      } while (codes.includes(code) && attempts < 10);

      const { error } = await supabase
        .from('beta_codes')
        .insert({ code });

      if (error) {
        // If duplicate (unlikely), try again
        if (error.code === '23505') {
          i--;
          continue;
        }
        console.error('Error inserting beta code:', error);
        return NextResponse.json(
          { error: 'Failed to generate codes' },
          { status: 500 }
        );
      }

      codes.push(code);
    }

    return NextResponse.json({ codes });
  } catch (error) {
    console.error('Beta admin generate error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
