import { PublicKey } from '@solana/web3.js';

export const TOKENS = {
  SOL: {
    symbol: 'SOL',
    name: 'Solana',
    mint: 'So11111111111111111111111111111111111111112',
    decimals: 9,
    logoURI: 'https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/So11111111111111111111111111111111111111112/logo.png',
  },
  USDC: {
    symbol: 'USDC',
    name: 'USD Coin',
    mint: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
    decimals: 6,
    logoURI: 'https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v/logo.png',
  },
  USDT: {
    symbol: 'USDT',
    name: 'Tether USD',
    mint: 'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB',
    decimals: 6,
    logoURI: 'https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB/logo.svg',
  },
  cbBTC: {
    symbol: 'cbBTC',
    name: 'Coinbase Wrapped BTC',
    mint: 'cbbtcf3aa214zXHbiAZQwf4122FBYbraNdFqgw4iMij',
    decimals: 8,
    logoURI: 'https://s2.coinmarketcap.com/static/img/coins/64x64/1.png',
  },
  ZEC: {
    symbol: 'ZEC',
    name: 'Zcash',
    mint: 'A7bdiYdS5GjqGFtxf17ppRHtDKPkkRqbKtR27dxvQXaS',
    decimals: 8,
    logoURI: 'https://s2.coinmarketcap.com/static/img/coins/64x64/1437.png',
  },
} as const;

export const SUPPORTED_INPUT_TOKENS = [TOKENS.USDC, TOKENS.USDT];
export const SUPPORTED_OUTPUT_TOKENS = [TOKENS.SOL, TOKENS.cbBTC, TOKENS.ZEC];

// Mint addresses for easy reference
export const SOL_MINT = TOKENS.SOL.mint;
export const USDC_MINT = TOKENS.USDC.mint;
export const USDT_MINT = TOKENS.USDT.mint;
export const CBBTC_MINT = TOKENS.cbBTC.mint;
export const ZEC_MINT = TOKENS.ZEC.mint;

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
  { label: 'Every 5 mins (Test)', value: 5 / 60 },
  { label: 'Every hour', value: 1 },
  { label: 'Every 4 hours', value: 4 },
  { label: 'Every 12 hours', value: 12 },
  { label: 'Daily', value: 24 },
  { label: 'Weekly', value: 168 },
] as const;

export const getTokenPublicKey = (mint: string): PublicKey => {
  return new PublicKey(mint);
};
