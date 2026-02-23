export interface User {
  id: string;
  wallet_address: string;
  created_at: string;
}

export interface DCAConfig {
  id: string;
  user_id: string;
  input_token: string;
  output_token: string;
  total_amount: number;
  amount_per_trade: number;
  frequency_hours: number;
  total_trades: number;
  completed_trades: number;
  status: 'active' | 'paused' | 'completed' | 'cancelled' | 'executing' | 'pending_deposit';
  encrypted_data: string;
  next_execution: string;
  source: 'dashboard' | 'blink';
  blink_deposit_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface Execution {
  id: string;
  dca_config_id: string;
  trade_number: number;
  input_amount: number;
  output_amount: number | null;
  tx_signature: string | null;
  status: 'pending' | 'success' | 'failed';
  error_message: string | null;
  executed_at: string;
}

export interface WalletTransaction {
  id: string;
  user_id: string;
  type: 'deposit' | 'withdraw';
  token_mint: string;
  amount: number;
  tx_signature: string | null;
  status: 'success' | 'failed';
  created_at: string;
}

export interface TokenInfo {
  symbol: string;
  name: string;
  mint: string;
  decimals: number;
  logoURI?: string;
}

export interface ShieldedBalance {
  token: TokenInfo;
  amount: number;
  usdValue?: number;
}

export interface JupiterQuote {
  inputMint: string;
  outputMint: string;
  inAmount: string;
  outAmount: string;
  otherAmountThreshold: string;
  swapMode: string;
  slippageBps: number;
  priceImpactPct: string;
  routePlan: RoutePlan[];
}

export interface RoutePlan {
  swapInfo: {
    ammKey: string;
    label: string;
    inputMint: string;
    outputMint: string;
    inAmount: string;
    outAmount: string;
    feeAmount: string;
    feeMint: string;
  };
  percent: number;
}

export interface CreateDCAParams {
  inputToken: TokenInfo;
  outputToken: TokenInfo;
  totalAmount: number;
  amountPerTrade: number;
  frequencyHours: number;
}

export interface DCAState {
  dcaConfigs: DCAConfig[];
  executions: Execution[];
  isLoading: boolean;
  error: string | null;
  fetchDCAConfigs: () => Promise<void>;
  fetchExecutions: (dcaConfigId: string) => Promise<void>;
  createDCA: (params: CreateDCAParams) => Promise<DCAConfig | null>;
  pauseDCA: (id: string) => Promise<void>;
  cancelDCA: (id: string) => Promise<void>;
}

export interface BlinkDeposit {
  id: string;
  user_wallet: string;
  escrow_wallet: string;
  amount: number;
  output_token: string;
  frequency_hours: number;
  amount_per_trade: number;
  tx_signature: string | null;
  reference_key: string;
  status: 'pending_confirmation' | 'confirmed' | 'processing' | 'processed' | 'failed';
  dca_config_id: string | null;
  error_message: string | null;
  created_at: string;
  confirmed_at: string | null;
  processed_at: string | null;
}

export interface ShieldedState {
  balances: ShieldedBalance[];
  isLoading: boolean;
  fetchBalances: () => Promise<void>;
  deposit: (token: TokenInfo, amount: number) => Promise<void>;
  withdraw: (token: TokenInfo, amount: number, recipient: string) => Promise<void>;
}
