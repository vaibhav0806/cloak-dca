export const GRAIL_CONFIG = {
  baseUrl: 'https://oro-tradebook-devnet.up.railway.app',
  partnerId: process.env.GRAIL_PARTNER_ID || '',
  apiKey: process.env.GRAIL_EXECUTIVE_AUTHORITY_API_KEY || '',
  privateKey: process.env.GRAIL_PRIVATE_KEY || '',
  centralVaultWallet: process.env.GRAIL_CENTRAL_VAULT_WALLET || '',
} as const;
