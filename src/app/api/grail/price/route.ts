import { NextResponse } from 'next/server';
import { grailService } from '@/lib/grail';

export async function GET() {
  try {
    const priceData = await grailService.getGoldPrice();

    return NextResponse.json({
      price: priceData.price,
      unit: priceData.unit || 'troy_ounce',
      currency: priceData.currency || 'USD',
      timestamp: priceData.timestamp || new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error fetching gold price:', error);
    return NextResponse.json(
      { error: 'Failed to fetch gold price' },
      { status: 500 }
    );
  }
}
