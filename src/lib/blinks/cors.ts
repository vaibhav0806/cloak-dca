import { NextResponse } from 'next/server';

const ACTION_CORS_HEADERS: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, OPTIONS',
  'Access-Control-Allow-Headers':
    'Content-Type, Authorization, Content-Encoding, Accept-Encoding',
  'Access-Control-Expose-Headers': 'X-Action-Version, X-Blockchain-Ids',
  'X-Action-Version': '2.2',
  'X-Blockchain-Ids': 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp',
};

export function withActionCors(response: NextResponse): NextResponse {
  for (const [key, value] of Object.entries(ACTION_CORS_HEADERS)) {
    response.headers.set(key, value);
  }
  return response;
}

export function actionCorsOptions(): NextResponse {
  return withActionCors(new NextResponse(null, { status: 204 }));
}
