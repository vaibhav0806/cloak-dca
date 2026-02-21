import { PublicKey } from '@solana/web3.js';
import type { TokenInfo } from '@/types';

export const TOKENS: Record<string, TokenInfo> = {
  SOL: {
    symbol: 'SOL',
    name: 'Solana',
    mint: 'So11111111111111111111111111111111111111112',
    decimals: 9,
    logoURI: 'https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/So11111111111111111111111111111111111111112/logo.png',
  },
  USDC: {
    symbol: 'USDC',
    name: 'USD Coin (Devnet)',
    mint: '4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU',
    decimals: 6,
    logoURI: 'https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v/logo.png',
  },
  GOLD: {
    symbol: 'GOLD',
    name: 'GRAIL Gold',
    mint: 'GoLDYYajoSPiRMbRs6MXKBPV8MAfdosfYfG95fqsmawt',
    decimals: 9,
    logoURI: '/gold-icon.png',
    isGrailAsset: true,
  },
};

export const SUPPORTED_INPUT_TOKENS: TokenInfo[] = [TOKENS.USDC];
export const SUPPORTED_OUTPUT_TOKENS: TokenInfo[] = [TOKENS.SOL, TOKENS.GOLD];

// Mint addresses for easy reference
export const SOL_MINT = TOKENS.SOL.mint;
export const USDC_MINT = TOKENS.USDC.mint;
export const GOLD_MINT = TOKENS.GOLD.mint;

// Legacy mainnet mints (unused on devnet, kept for module compat)
export const USDT_MINT = 'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB';
export const CBBTC_MINT = 'cbbtcf3aa214zXHbiAZQwf4122FBYbraNdFqgw4iMij';
export const ZEC_MINT = 'A7bdiYdS5GjqGFtxf17ppRHtDKPkkRqbKtR27dxvQXaS';

export const DEVNET_TOKENS = {
  SOL: {
    symbol: 'SOL',
    name: 'Solana',
    mint: 'So11111111111111111111111111111111111111112',
    decimals: 9,
  },
  USDC: {
    symbol: 'USDC',
    name: 'USD Coin (Devnet)',
    mint: '4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU',
    decimals: 6,
  },
} as const;

export const FREQUENCY_OPTIONS = [
  { label: 'Every hour', value: 1 },
  { label: 'Every 4 hours', value: 4 },
  { label: 'Every 12 hours', value: 12 },
  { label: 'Daily', value: 24 },
  { label: 'Weekly', value: 168 },
] as const;

export const getTokenPublicKey = (mint: string): PublicKey => {
  return new PublicKey(mint);
};
