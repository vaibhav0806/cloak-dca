'use client';

import { useState, useEffect, useRef } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { useShieldedBalance } from '@/hooks/useShieldedBalance';
import { useDCAConfigs } from '@/hooks/useDCAConfigs';
import { useAppStore } from '@/store';
import { Button } from '@/components/ui/button';
import { CreateDCAModal } from '@/components/dca/CreateDCAModal';
import {
  Plus,
  ArrowDownToLine,
  ArrowUpFromLine,
  Check,
  X,
  Copy,
  ExternalLink,
  Pause,
  Play,
  RefreshCw,
  ChevronDown,
  Wallet,
  AlertCircle,
  ChevronRight,
  Shield,
  Settings,
} from 'lucide-react';
import { formatDistanceToNow, format } from 'date-fns';
import { TOKENS, USDC_MINT } from '@/lib/solana/constants';
import { getExplorerUrl, getConnection } from '@/lib/solana/connection';
import type { DCAConfig, Execution, WalletTransaction } from '@/types';
import { LAMPORTS_PER_SOL, PublicKey, Transaction } from '@solana/web3.js';
import { SessionWallet } from './SessionWallet';
import { getAssociatedTokenAddress, createTransferInstruction, createAssociatedTokenAccountInstruction, getAccount, TokenAccountNotFoundError } from '@solana/spl-token';

function getTokenInfo(mint: string) {
  const token = Object.values(TOKENS).find((t) => t.mint === mint);
  return token || { symbol: mint.slice(0, 4), name: 'Unknown', decimals: 9, mint, logoURI: undefined };
}

// Calculate which DCAs will be funded based on available balance
// Returns a map of DCA id -> { funded: boolean, position: number }
function calculateDCAFundingStatus(
  activeConfigs: DCAConfig[],
  totalBalance: number
): Map<string, { funded: boolean; position: number; shortfall: number }> {
  const result = new Map<string, { funded: boolean; position: number; shortfall: number }>();

  if (activeConfigs.length === 0) return result;

  // Sort by next execution time (earliest first)
  const sortedConfigs = [...activeConfigs]
    .filter(c => c.status === 'active')
    .sort((a, b) => new Date(a.next_execution).getTime() - new Date(b.next_execution).getTime());

  let remainingBalance = totalBalance;

  sortedConfigs.forEach((config, index) => {
    const requiredAmount = config.amount_per_trade;
    const funded = remainingBalance >= requiredAmount;
    const shortfall = funded ? 0 : requiredAmount - remainingBalance;

    result.set(config.id, {
      funded,
      position: index + 1,
      shortfall,
    });

    if (funded) {
      remainingBalance -= requiredAmount;
    }
  });

  return result;
}


export function Dashboard() {
  const { publicKey, sendTransaction } = useWallet();
  const { balances, isLoading: balancesLoading, hasFetched: hasFetchedBalances, fetchBalances, deposit, withdraw, getSessionPublicKey, isInitialized } = useShieldedBalance();
  const { isLoading: configsLoading, getActiveConfigs, getPausedConfigs, pauseDCA, resumeDCA, cancelDCA } = useDCAConfigs();
  const { setCreateModalOpen } = useAppStore();

  const [expandedStrategy, setExpandedStrategy] = useState<string | null>(null);
  const [showDeposit, setShowDeposit] = useState(false);
  const [showWithdraw, setShowWithdraw] = useState(false);
  const [depositAmount, setDepositAmount] = useState('');
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [withdrawToken, setWithdrawToken] = useState('');
  const [isDepositing, setIsDepositing] = useState(false);
  const [isWithdrawing, setIsWithdrawing] = useState(false);
  const [sessionKey, setSessionKey] = useState<string | null>(null);
  const [sessionBalance, setSessionBalance] = useState<number | null>(null);
  const [sessionUsdcBalance, setSessionUsdcBalance] = useState<number | null>(null);
  const [copied, setCopied] = useState(false);
  const [recentExecutions, setRecentExecutions] = useState<Array<Execution & { input_token: string; output_token: string }>>([]);
  const [walletTransactions, setWalletTransactions] = useState<WalletTransaction[]>([]);
  const [depositSuccess, setDepositSuccess] = useState(false);
  const [depositTx, setDepositTx] = useState<string | null>(null);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [activityPage, setActivityPage] = useState(0);
  const ACTIVITY_PAGE_SIZE = 5;

  // Setup flow states
  const [setupStep, setSetupStep] = useState<'checking' | 'fund_gas' | 'ready' | 'depositing'>('checking');
  const [setupError, setSetupError] = useState<string | null>(null);

  // Track mounted state
  const isMounted = useRef(true);
  useEffect(() => {
    isMounted.current = true;
    return () => { isMounted.current = false; };
  }, []);

  const activeConfigs = getActiveConfigs();
  const pausedConfigs = getPausedConfigs();
  const allStrategies = [...activeConfigs, ...pausedConfigs];

  const totalShielded = balances.reduce((acc, b) => acc + (b.usdValue || 0), 0);
  const hasShieldedBalance = totalShielded > 0;
  const hasStrategies = allStrategies.length > 0;
  const sessionFunded = sessionBalance !== null && sessionBalance >= 0.005;

  // Calculate DCA funding status
  const dcaFundingStatus = calculateDCAFundingStatus(activeConfigs, totalShielded);
  const totalDCARequirement = activeConfigs
    .filter(c => c.status === 'active')
    .reduce((sum, config) => sum + config.amount_per_trade, 0);
  const hasUnderfundedDCAs = totalShielded < totalDCARequirement && activeConfigs.length > 0;
  const fundingShortfall = Math.max(0, totalDCARequirement - totalShielded);

  // Determine if user needs onboarding
  const needsOnboarding = !hasShieldedBalance && !hasStrategies;

  // Fetch session key and balance
  useEffect(() => {
    if (isInitialized && !sessionKey) {
      getSessionPublicKey().then(async (key) => {
        if (!isMounted.current) return;
        setSessionKey(key);
        try {
          const connection = getConnection();
          const balance = await connection.getBalance(new PublicKey(key));
          if (!isMounted.current) return;
          setSessionBalance(balance / LAMPORTS_PER_SOL);

          // Check USDC balance
          const usdcMint = new PublicKey(USDC_MINT);
          const ata = await getAssociatedTokenAddress(usdcMint, new PublicKey(key));
          const accountInfo = await connection.getAccountInfo(ata);
          if (accountInfo && isMounted.current) {
            const data = accountInfo.data;
            const usdcBalance = data.readBigUInt64LE(64);
            setSessionUsdcBalance(Number(usdcBalance) / 1e6);
          } else if (isMounted.current) {
            setSessionUsdcBalance(0);
          }

          // Determine setup step
          if (balance >= 0.005 * LAMPORTS_PER_SOL) {
            setSetupStep('ready');
          } else {
            setSetupStep('fund_gas');
          }
        } catch (e) {
          console.error('Failed to fetch session balance:', e);
          if (isMounted.current) {
            setSessionBalance(0);
            setSessionUsdcBalance(0);
            setSetupStep('fund_gas');
          }
        }
      }).catch(console.error);
    }
  }, [isInitialized, sessionKey, getSessionPublicKey]);

  // Refresh session balance periodically
  useEffect(() => {
    if (!sessionKey) return;
    const interval = setInterval(async () => {
      if (!isMounted.current) return;
      try {
        const connection = getConnection();
        const balance = await connection.getBalance(new PublicKey(sessionKey));
        if (!isMounted.current) return;
        setSessionBalance(balance / LAMPORTS_PER_SOL);

        // Also refresh USDC balance
        const usdcMint = new PublicKey(USDC_MINT);
        const ata = await getAssociatedTokenAddress(usdcMint, new PublicKey(sessionKey));
        const accountInfo = await connection.getAccountInfo(ata);
        if (accountInfo && isMounted.current) {
          const data = accountInfo.data;
          const usdcBalance = data.readBigUInt64LE(64);
          setSessionUsdcBalance(Number(usdcBalance) / 1e6);
        }

        // Update setup step if funded
        if (balance >= 0.005 * LAMPORTS_PER_SOL && setupStep === 'fund_gas') {
          setSetupStep('ready');
        }
      } catch (e) {
        console.error('Failed to refresh session balance:', e);
      }
    }, 10000);
    return () => clearInterval(interval);
  }, [sessionKey, setupStep]);

  // Fetch recent executions and transactions
  useEffect(() => {
    if (publicKey) {
      fetchRecentActivity();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [publicKey, hasStrategies]);

  const fetchRecentActivity = async () => {
    if (!publicKey || !isMounted.current) return;
    const walletAddress = publicKey.toBase58();

    // Fetch wallet transactions (deposits/withdrawals)
    try {
      const txResponse = await fetch('/api/transactions', {
        headers: { 'x-wallet-address': walletAddress },
      });
      if (txResponse.ok && isMounted.current) {
        const data = await txResponse.json();
        setWalletTransactions(data.transactions || []);
      }
    } catch (error) {
      console.error('Error fetching wallet transactions:', error);
    }

    // Fetch trade executions from all DCAs (including completed/cancelled)
    try {
      const configsResponse = await fetch('/api/dca/list', {
        headers: { 'x-wallet-address': walletAddress },
      });
      if (!configsResponse.ok || !isMounted.current) return;

      const dcaConfigs: DCAConfig[] = await configsResponse.json();
      const allExecutions: Array<Execution & { input_token: string; output_token: string }> = [];

      for (const config of dcaConfigs.slice(0, 5)) {
        if (!isMounted.current) return;
        try {
          const execResponse = await fetch(`/api/dca/${config.id}/executions`, {
            headers: { 'x-wallet-address': walletAddress },
          });
          if (execResponse.ok && isMounted.current) {
            const data = await execResponse.json();
            const configExecutions = (data.executions || []).slice(0, 3).map((exec: Execution) => ({
              ...exec,
              input_token: config.input_token,
              output_token: config.output_token,
            }));
            allExecutions.push(...configExecutions);
          }
        } catch (error) {
          console.error(`Error fetching executions:`, error);
        }
      }

      if (!isMounted.current) return;
      allExecutions.sort((a, b) => new Date(b.executed_at).getTime() - new Date(a.executed_at).getTime());
      setRecentExecutions(allExecutions.slice(0, 5));
    } catch (error) {
      console.error('Error fetching executions:', error);
    }
  };

  const handleDeposit = async () => {
    if (!depositAmount || isNaN(Number(depositAmount)) || !publicKey || !sessionKey) return;

    // Check if session wallet needs gas
    if (!sessionFunded) {
      setSetupStep('fund_gas');
      return;
    }

    setIsDepositing(true);
    setSetupStep('depositing');
    setDepositSuccess(false);
    setSetupError(null);

    try {
      const connection = getConnection();
      const usdcMint = new PublicKey(USDC_MINT);
      const sessionPublicKey = new PublicKey(sessionKey);
      const amount = Number(depositAmount);
      const amountInBaseUnits = Math.floor(amount * 1e6); // USDC has 6 decimals

      // Get ATAs
      const sourceAta = await getAssociatedTokenAddress(usdcMint, publicKey);
      const destAta = await getAssociatedTokenAddress(usdcMint, sessionPublicKey);

      // Check existing balance in session wallet
      let existingBalance = 0;
      try {
        const accountInfo = await connection.getAccountInfo(destAta);
        if (accountInfo) {
          existingBalance = Number(accountInfo.data.readBigUInt64LE(64)) / 1e6;
          console.log(`Session wallet already has ${existingBalance} USDC`);
        }
      } catch {
        // No existing balance
      }

      // Step 1: Transfer USDC from main wallet to session wallet
      console.log(`Transferring ${amount} USDC from main wallet to session wallet...`);

      const transaction = new Transaction();

      // Check if destination ATA exists, if not create it
      try {
        await getAccount(connection, destAta);
      } catch (error) {
        if (error instanceof TokenAccountNotFoundError) {
          console.log('Creating USDC token account for session wallet...');
          transaction.add(
            createAssociatedTokenAccountInstruction(
              publicKey, // payer
              destAta,   // ata
              sessionPublicKey, // owner
              usdcMint   // mint
            )
          );
        } else {
          throw error;
        }
      }

      // Add transfer instruction
      transaction.add(
        createTransferInstruction(
          sourceAta,
          destAta,
          publicKey,
          amountInBaseUnits
        )
      );

      // Get recent blockhash
      const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash();
      transaction.recentBlockhash = blockhash;
      transaction.feePayer = publicKey;

      // Sign and send transaction using wallet adapter
      const transferSig = await sendTransaction(transaction, connection);
      console.log(`USDC transfer signature: ${transferSig}`);

      // Wait for confirmation with longer timeout
      console.log('Waiting for transfer confirmation...');
      const confirmation = await connection.confirmTransaction({
        signature: transferSig,
        blockhash,
        lastValidBlockHeight,
      }, 'confirmed');

      if (confirmation.value.err) {
        throw new Error(`Transfer failed: ${JSON.stringify(confirmation.value.err)}`);
      }
      console.log('USDC transfer confirmed');

      // Step 2: Wait a bit and verify USDC arrived in session wallet
      console.log('Verifying USDC balance in session wallet...');
      await new Promise(resolve => setTimeout(resolve, 2000));

      let sessionUsdcAmount = 0;
      let retries = 5;
      while (retries > 0) {
        try {
          const accountInfo = await connection.getAccountInfo(destAta);
          if (accountInfo) {
            sessionUsdcAmount = Number(accountInfo.data.readBigUInt64LE(64)) / 1e6;
            console.log(`Session wallet USDC balance: ${sessionUsdcAmount}`);
            if (sessionUsdcAmount >= amount * 0.99) { // Allow 1% tolerance
              break;
            }
          }
        } catch (e) {
          console.log('Waiting for token account...', e);
        }
        retries--;
        if (retries > 0) {
          await new Promise(resolve => setTimeout(resolve, 2000));
        }
      }

      if (sessionUsdcAmount < amount * 0.99) {
        throw new Error(`Transfer may have failed. Expected ${amount} USDC but found ${sessionUsdcAmount.toFixed(2)} USDC in session wallet. Please check your session wallet balance.`);
      }

      // Step 3: Deposit ALL USDC from session wallet into the privacy pool
      // Pass depositAll=true to ensure we deposit everything (including any leftover from previous attempts)
      console.log(`Depositing all USDC (at least ${amount}) into privacy pool...`);
      const result = await deposit(USDC_MINT, amount, true);

      if (!isMounted.current) return;
      setDepositAmount('');
      setShowDeposit(false);
      setDepositSuccess(true);
      setDepositTx(result?.signature || null);
      setSetupStep('ready');

      // Refresh activity immediately, then balances with delays
      fetchRecentActivity();

      const delays = [3000, 5000, 8000];
      for (const delay of delays) {
        if (!isMounted.current) return;
        await new Promise(resolve => setTimeout(resolve, delay));
        if (!isMounted.current) return;
        await fetchBalances(true);
      }
    } catch (error) {
      console.error('Deposit failed:', error);
      setSetupError(error instanceof Error ? error.message : 'Deposit failed');
      setSetupStep('ready');
    } finally {
      if (isMounted.current) setIsDepositing(false);
    }
  };

  const handleWithdraw = async () => {
    if (!withdrawAmount || !withdrawToken || !publicKey) return;
    setIsWithdrawing(true);
    try {
      await withdraw(withdrawToken, Number(withdrawAmount), publicKey.toBase58());
      if (!isMounted.current) return;
      setWithdrawAmount('');
      setWithdrawToken('');
      setShowWithdraw(false);
      fetchBalances(true);
      fetchRecentActivity();
    } catch (error) {
      console.error('Withdraw failed:', error);
    } finally {
      if (isMounted.current) setIsWithdrawing(false);
    }
  };

  const copySessionKey = () => {
    if (sessionKey) {
      navigator.clipboard.writeText(sessionKey);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  // Loading state
  if (!hasFetchedBalances || sessionBalance === null) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="relative">
          <div className="h-10 w-10 rounded-full border-2 border-muted" />
          <div className="absolute inset-0 h-10 w-10 rounded-full border-2 border-transparent border-t-accent animate-spin" />
        </div>
      </div>
    );
  }

  // New user onboarding - simplified one-step flow
  if (needsOnboarding) {
    return (
      <div className="min-h-screen pt-24 pb-20">
        <div className="max-w-xl mx-auto px-6">
          {/* Header */}
          <div className="text-center mb-10">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-accent/10 border border-accent/20 mb-6">
              <Shield className="h-4 w-4 text-accent" />
              <span className="text-sm text-accent">Private DCA</span>
            </div>
            <h1 className="text-3xl font-light mb-3">Start Accumulating Privately</h1>
            <p className="text-muted-foreground">
              Deposit funds to begin automated, untraceable dollar-cost averaging.
            </p>
          </div>

          {/* Main Card */}
          <div className="rounded-xl bg-card border border-border overflow-hidden">
            {/* Gas funding step */}
            {setupStep === 'fund_gas' && (
              <div className="p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 rounded-lg bg-accent/10">
                    <Wallet className="h-5 w-5 text-accent" />
                  </div>
                  <div>
                    <h2 className="font-medium">One-time Setup</h2>
                    <p className="text-sm text-muted-foreground">Send ~0.05 SOL for transaction fees</p>
                  </div>
                </div>

                <div className="p-4 rounded-lg bg-muted/50 mb-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs text-muted-foreground">Send SOL to this address</span>
                    <button
                      onClick={copySessionKey}
                      className="text-xs text-accent hover:text-accent/80 flex items-center gap-1"
                    >
                      {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                      {copied ? 'Copied!' : 'Copy'}
                    </button>
                  </div>
                  <code className="text-xs text-mono break-all">{sessionKey || 'Loading...'}</code>
                </div>

                <div className="flex items-center justify-between p-4 rounded-lg border border-border mb-4">
                  <div>
                    <p className="text-xs text-muted-foreground">Current Balance</p>
                    <p className="text-lg font-medium text-mono">{sessionBalance?.toFixed(4) || '0'} SOL</p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={async () => {
                      if (sessionKey) {
                        const connection = getConnection();
                        const balance = await connection.getBalance(new PublicKey(sessionKey));
                        setSessionBalance(balance / LAMPORTS_PER_SOL);
                        if (balance >= 0.005 * LAMPORTS_PER_SOL) {
                          setSetupStep('ready');
                        }
                      }
                    }}
                  >
                    <RefreshCw className="h-4 w-4" />
                  </Button>
                </div>

                <p className="text-xs text-muted-foreground text-center">
                  This SOL covers gas fees for your automatic DCA trades. You only need to do this once.
                </p>
              </div>
            )}

            {/* Ready to deposit */}
            {setupStep === 'ready' && (
              <div className="p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 rounded-lg bg-accent/10">
                    <ArrowDownToLine className="h-5 w-5 text-accent" />
                  </div>
                  <div>
                    <h2 className="font-medium">Deposit USDC</h2>
                    <p className="text-sm text-muted-foreground">Add funds to your private balance</p>
                  </div>
                </div>

                {setupError && (
                  <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 mb-4 flex items-start gap-2">
                    <AlertCircle className="h-4 w-4 text-destructive mt-0.5 shrink-0" />
                    <p className="text-sm text-destructive">{setupError}</p>
                  </div>
                )}

                <div className="space-y-4">
                  <div>
                    <input
                      type="number"
                      placeholder="Amount (USDC)"
                      value={depositAmount}
                      onChange={(e) => setDepositAmount(e.target.value)}
                      className="w-full px-4 py-3 bg-background border border-border rounded-lg text-mono text-lg"
                      autoFocus
                    />
                  </div>

                  {/* Quick amounts */}
                  <div className="flex gap-2">
                    {[10, 50, 100, 500].map((amount) => (
                      <button
                        key={amount}
                        onClick={() => setDepositAmount(amount.toString())}
                        className="flex-1 py-2 text-sm rounded-lg bg-muted hover:bg-muted/80 transition-colors"
                      >
                        ${amount}
                      </button>
                    ))}
                  </div>

                  <Button
                    onClick={handleDeposit}
                    disabled={isDepositing || !depositAmount || Number(depositAmount) <= 0}
                    className="w-full"
                  >
                    {isDepositing ? 'Depositing...' : 'Deposit & Shield'}
                  </Button>

                  <p className="text-xs text-muted-foreground text-center">
                    Your funds are shielded into a private pool, making your DCA trades untraceable.
                  </p>
                </div>
              </div>
            )}

            {/* Depositing state */}
            {setupStep === 'depositing' && (
              <div className="p-6 text-center">
                <div className="relative w-12 h-12 mx-auto mb-4">
                  <div className="absolute inset-0 rounded-full border-2 border-muted" />
                  <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-accent animate-spin" />
                </div>
                <h2 className="font-medium mb-2">Shielding Your Funds</h2>
                <p className="text-sm text-muted-foreground">
                  This may take a moment while the privacy proof is generated...
                </p>
              </div>
            )}

            {/* Success */}
            {depositSuccess && (
              <div className="p-6 text-center">
                <div className="w-12 h-12 rounded-full bg-green-500/20 flex items-center justify-center mx-auto mb-4">
                  <Check className="h-6 w-6 text-green-500" />
                </div>
                <h2 className="font-medium mb-2">Deposit Successful!</h2>
                <p className="text-sm text-muted-foreground mb-6">
                  Your funds are now private. Create a DCA strategy to start accumulating.
                </p>
                {depositTx && (
                  <a
                    href={`https://solscan.io/tx/${depositTx}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 text-sm text-accent hover:underline mb-6"
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                    View transaction
                  </a>
                )}
                <Button onClick={() => setCreateModalOpen(true)} className="w-full gap-2">
                  <Plus className="h-4 w-4" />
                  Create DCA Strategy
                </Button>
              </div>
            )}
          </div>

          {/* How it works */}
          <div className="mt-10 text-center">
            <p className="text-sm text-muted-foreground mb-4">How it works</p>
            <div className="flex items-center justify-center gap-6 text-xs text-muted-foreground">
              <div className="text-center">
                <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center mx-auto mb-2">1</div>
                <span>Deposit</span>
              </div>
              <ChevronRight className="h-4 w-4" />
              <div className="text-center">
                <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center mx-auto mb-2">2</div>
                <span>Create DCA</span>
              </div>
              <ChevronRight className="h-4 w-4" />
              <div className="text-center">
                <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center mx-auto mb-2">3</div>
                <span>Auto-accumulate</span>
              </div>
            </div>
          </div>
        </div>
        <CreateDCAModal />
      </div>
    );
  }

  // Normal dashboard view
  return (
    <div className="min-h-screen pt-24 pb-20">
      <div className="max-w-2xl mx-auto px-6">

        {/* Balance Section */}
        <section className="mb-14">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <p className="text-sm text-muted-foreground">Private Balance</p>
              <div className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-accent/10">
                <Shield className="h-3 w-3 text-accent" />
              </div>
            </div>
            <button
              onClick={() => fetchBalances(true)}
              disabled={balancesLoading}
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              <RefreshCw className={`h-4 w-4 ${balancesLoading ? 'animate-spin' : ''}`} />
            </button>
          </div>

          <p className="text-5xl font-light tracking-tight mb-6">
            <span className="text-muted-foreground">$</span>
            {totalShielded.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>

          {/* Asset pills */}
          {balances.length > 0 && (
            <div className="flex flex-wrap gap-3 mb-6">
              {balances.filter(b => b.amount > 0).map((balance) => (
                <div key={balance.token.mint} className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-card border border-border text-sm">
                  {balance.token.logoURI && (
                    <img src={balance.token.logoURI} alt="" className="h-4 w-4 rounded-full" />
                  )}
                  <span className="font-medium">{balance.amount.toLocaleString('en-US', { maximumFractionDigits: 2 })}</span>
                  <span className="text-muted-foreground">{balance.token.symbol}</span>
                </div>
              ))}
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3">
            <Button
              variant={showDeposit ? 'default' : 'outline'}
              size="sm"
              onClick={() => { setShowDeposit(!showDeposit); setShowWithdraw(false); }}
              className="gap-2"
            >
              <ArrowDownToLine className="h-4 w-4" />
              Add Funds
            </Button>
            <Button
              variant={showWithdraw ? 'default' : 'outline'}
              size="sm"
              onClick={() => {
                setShowWithdraw(!showWithdraw);
                setShowDeposit(false);
                if (balances.length > 0) setWithdrawToken(balances[0].token.mint);
              }}
              className="gap-2"
            >
              <ArrowUpFromLine className="h-4 w-4" />
              Withdraw
            </Button>
          </div>

          {/* Deposit Panel */}
          {showDeposit && (
            <div className="mt-4 p-5 rounded-lg bg-card border border-border">
              <p className="text-sm text-muted-foreground mb-3">Add USDC to your private balance</p>
              <div className="flex gap-3">
                <input
                  type="number"
                  placeholder="Amount"
                  value={depositAmount}
                  onChange={(e) => setDepositAmount(e.target.value)}
                  className="flex-1 px-4 py-2.5 bg-background border border-border rounded-lg text-mono"
                  autoFocus
                />
                <Button onClick={handleDeposit} disabled={isDepositing || !depositAmount}>
                  {isDepositing ? 'Adding...' : 'Confirm'}
                </Button>
              </div>
            </div>
          )}

          {/* Withdraw Panel */}
          {showWithdraw && (
            <div className="mt-4 p-5 rounded-lg bg-card border border-border">
              <p className="text-sm text-muted-foreground mb-3">Withdraw to your connected wallet</p>
              <div className="space-y-3">
                {balances.length > 1 && (
                  <select
                    value={withdrawToken}
                    onChange={(e) => setWithdrawToken(e.target.value)}
                    className="w-full px-4 py-2.5 bg-background border border-border rounded-lg text-sm"
                  >
                    {balances.map((b) => (
                      <option key={b.token.mint} value={b.token.mint}>
                        {b.token.symbol} — {b.amount.toFixed(2)} available
                      </option>
                    ))}
                  </select>
                )}
                <div className="flex gap-3">
                  <input
                    type="number"
                    placeholder="Amount"
                    value={withdrawAmount}
                    onChange={(e) => setWithdrawAmount(e.target.value)}
                    className="flex-1 px-4 py-2.5 bg-background border border-border rounded-lg text-mono"
                    autoFocus
                  />
                  <Button onClick={handleWithdraw} disabled={isWithdrawing || !withdrawAmount}>
                    {isWithdrawing ? 'Sending...' : 'Confirm'}
                  </Button>
                </div>
              </div>
            </div>
          )}
        </section>

        {/* Strategies Section */}
        <section className="mb-14">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-lg font-medium">Strategies</h2>
            <Button onClick={() => setCreateModalOpen(true)} size="sm" className="gap-2">
              <Plus className="h-4 w-4" />
              New
            </Button>
          </div>

          {/* Low gas (SOL) warning */}
          {!sessionFunded && hasStrategies && (
            <div className="mb-4 px-4 py-3 rounded-lg bg-red-500/5 border border-red-500/20 flex items-center justify-between">
              <div className="flex items-center gap-3 text-sm">
                <div className="w-1.5 h-1.5 rounded-full bg-red-400" />
                <span className="text-red-400/90">
                  Low gas — need <span className="font-mono">0.005 SOL</span>, have <span className="font-mono">{sessionBalance?.toFixed(4) || '0'}</span>
                </span>
              </div>
              <button
                onClick={copySessionKey}
                className="text-xs text-red-400 hover:text-red-300 transition-colors flex items-center gap-1"
              >
                {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                {copied ? 'Copied' : 'Copy address'}
              </button>
            </div>
          )}

          {/* Low USDC balance notice */}
          {hasUnderfundedDCAs && (
            <div className="mb-4 px-4 py-3 rounded-lg bg-orange-500/5 border border-orange-500/20 flex items-center justify-between">
              <div className="flex items-center gap-3 text-sm">
                <div className="w-1.5 h-1.5 rounded-full bg-orange-400" />
                <span className="text-orange-400/90">
                  Need <span className="font-mono">${totalDCARequirement.toFixed(2)}</span> for next trades, short <span className="font-mono">${fundingShortfall.toFixed(2)}</span>
                </span>
              </div>
              <button
                onClick={() => { setShowDeposit(true); setShowWithdraw(false); }}
                className="text-xs text-orange-400 hover:text-orange-300 transition-colors"
              >
                Add funds
              </button>
            </div>
          )}

          {configsLoading ? (
            <div className="space-y-3">
              {[1, 2].map((i) => (
                <div key={i} className="p-5 rounded-lg bg-card border border-border animate-pulse">
                  <div className="h-5 bg-muted rounded w-1/3 mb-3" />
                  <div className="h-2 bg-muted rounded w-full" />
                </div>
              ))}
            </div>
          ) : allStrategies.length === 0 ? (
            <div className="p-10 rounded-lg bg-card border border-dashed border-border text-center">
              <p className="text-muted-foreground mb-3">No active strategies</p>
              <Button onClick={() => setCreateModalOpen(true)} variant="outline" size="sm" className="gap-2">
                <Plus className="h-4 w-4" />
                Create Strategy
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {allStrategies.map((config) => {
                const fundingInfo = dcaFundingStatus.get(config.id);
                return (
                  <StrategyCard
                    key={config.id}
                    config={config}
                    isExpanded={expandedStrategy === config.id}
                    onToggle={() => setExpandedStrategy(expandedStrategy === config.id ? null : config.id)}
                    onPause={pauseDCA}
                    onResume={resumeDCA}
                    onCancel={cancelDCA}
                    fundingStatus={fundingInfo}
                  />
                );
              })}
            </div>
          )}
        </section>

        {/* Session Wallet - DCA'd tokens ready to withdraw */}
        <SessionWallet sessionPublicKey={sessionKey} />

        {/* Recent Activity */}
        {(recentExecutions.length > 0 || walletTransactions.length > 0) && (
          <section className="mb-14">
            <h2 className="text-lg font-medium mb-5">Recent Activity</h2>
            {(() => {
              type Activity =
                | { type: 'trade'; data: typeof recentExecutions[0]; date: Date }
                | { type: 'deposit' | 'withdraw'; data: WalletTransaction; date: Date };

              const activities: Activity[] = [
                ...recentExecutions.map(exec => ({
                  type: 'trade' as const,
                  data: exec,
                  date: new Date(exec.executed_at),
                })),
                ...walletTransactions.map(tx => ({
                  type: tx.type,
                  data: tx,
                  date: new Date(tx.created_at),
                })),
              ];

              activities.sort((a, b) => b.date.getTime() - a.date.getTime());

              const totalPages = Math.ceil(activities.length / ACTIVITY_PAGE_SIZE);
              const paginatedActivities = activities.slice(
                activityPage * ACTIVITY_PAGE_SIZE,
                (activityPage + 1) * ACTIVITY_PAGE_SIZE
              );

              return (
                <>
                  <div className="space-y-1">
                    {paginatedActivities.map((activity) => {
                      if (activity.type === 'trade') {
                        const exec = activity.data as typeof recentExecutions[0];
                        const inputToken = getTokenInfo(exec.input_token);
                        const outputToken = getTokenInfo(exec.output_token);
                        const isSuccess = exec.status === 'success';

                        return (
                          <div key={`trade-${exec.id}`} className="flex items-center justify-between py-3 border-b border-border last:border-0">
                            <div className="flex items-center gap-3">
                              <div className={`w-2 h-2 rounded-full ${isSuccess ? 'bg-green-500' : 'bg-red-500'}`} />
                              <div>
                                <p className="text-sm">
                                  <span className="font-medium">{exec.input_amount} {inputToken.symbol}</span>
                                  <span className="text-muted-foreground mx-1.5">→</span>
                                  <span className="font-medium">{exec.output_amount?.toFixed(4) || '—'} {outputToken.symbol}</span>
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  {format(activity.date, 'MMM d, h:mm a')}
                                </p>
                              </div>
                            </div>
                            {exec.tx_signature && (
                              <a
                                href={getExplorerUrl(exec.tx_signature)}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-muted-foreground hover:text-accent transition-colors p-1.5"
                              >
                                <ExternalLink className="h-3.5 w-3.5" />
                              </a>
                            )}
                          </div>
                        );
                      } else {
                        const tx = activity.data as WalletTransaction;
                        const token = getTokenInfo(tx.token_mint);
                        const isDeposit = activity.type === 'deposit';

                        return (
                          <div key={`tx-${tx.id}`} className="flex items-center justify-between py-3 border-b border-border last:border-0">
                            <div className="flex items-center gap-3">
                              <div className={`w-2 h-2 rounded-full ${isDeposit ? 'bg-accent' : 'bg-orange-500'}`} />
                              <div>
                                <p className="text-sm">
                                  <span className="font-medium">{isDeposit ? 'Deposited' : 'Withdrew'}</span>
                                  <span className="text-muted-foreground mx-1.5">{tx.amount.toFixed(2)}</span>
                                  <span className="font-medium">{token.symbol}</span>
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  {format(activity.date, 'MMM d, h:mm a')}
                                </p>
                              </div>
                            </div>
                            {tx.tx_signature && (
                              <a
                                href={getExplorerUrl(tx.tx_signature)}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-muted-foreground hover:text-accent transition-colors p-1.5"
                              >
                                <ExternalLink className="h-3.5 w-3.5" />
                              </a>
                            )}
                          </div>
                        );
                      }
                    })}
                  </div>

                  {/* Pagination */}
                  {totalPages > 1 && (
                    <div className="flex items-center justify-between mt-4 pt-4 border-t border-border/50">
                      <button
                        onClick={() => setActivityPage(p => Math.max(0, p - 1))}
                        disabled={activityPage === 0}
                        className="text-xs text-muted-foreground hover:text-foreground disabled:opacity-30 disabled:hover:text-muted-foreground transition-colors"
                      >
                        ← Newer
                      </button>
                      <span className="text-xs text-muted-foreground/60 tabular-nums">
                        {activityPage + 1} / {totalPages}
                      </span>
                      <button
                        onClick={() => setActivityPage(p => Math.min(totalPages - 1, p + 1))}
                        disabled={activityPage >= totalPages - 1}
                        className="text-xs text-muted-foreground hover:text-foreground disabled:opacity-30 disabled:hover:text-muted-foreground transition-colors"
                      >
                        Older →
                      </button>
                    </div>
                  )}
                </>
              );
            })()}
          </section>
        )}

        {/* Advanced Section (collapsed by default) */}
        <section className="pt-6 border-t border-border">
          <button
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <Settings className="h-4 w-4" />
            <span>Advanced</span>
            <ChevronRight className={`h-4 w-4 transition-transform ${showAdvanced ? 'rotate-90' : ''}`} />
          </button>

          {showAdvanced && (
            <div className="mt-4 p-4 rounded-lg bg-card border border-border space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Gas Wallet</span>
                <div className="flex items-center gap-2">
                  <span className="text-mono text-xs">{sessionKey?.slice(0, 8)}...{sessionKey?.slice(-6)}</span>
                  <button
                    onClick={copySessionKey}
                    className="text-muted-foreground hover:text-foreground"
                  >
                    {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                  </button>
                </div>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Gas Balance</span>
                <span className="text-mono">{sessionBalance?.toFixed(4)} SOL</span>
              </div>
              {(sessionUsdcBalance || 0) > 0 && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Pending USDC</span>
                  <span className="text-mono">{sessionUsdcBalance?.toFixed(2)} USDC</span>
                </div>
              )}
            </div>
          )}
        </section>

      </div>

      <CreateDCAModal />
    </div>
  );
}

// Strategy Card Component
function StrategyCard({
  config,
  isExpanded,
  onToggle,
  onPause,
  onResume,
  onCancel,
  fundingStatus,
}: {
  config: DCAConfig;
  isExpanded: boolean;
  onToggle: () => void;
  onPause: (id: string) => Promise<void>;
  onResume: (id: string) => Promise<void>;
  onCancel: (id: string) => Promise<void>;
  fundingStatus?: { funded: boolean; position: number; shortfall: number };
}) {
  const inputToken = getTokenInfo(config.input_token);
  const outputToken = getTokenInfo(config.output_token);
  const progress = (config.completed_trades / config.total_trades) * 100;
  const isActive = config.status === 'active';
  const isPaused = config.status === 'paused';
  const isUnderfunded = fundingStatus && !fundingStatus.funded && isActive;

  return (
    <div className="rounded-lg bg-card border border-border overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full p-4 flex items-center justify-between text-left hover:bg-muted/30 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="flex -space-x-1.5">
            {inputToken.logoURI ? (
              <img src={inputToken.logoURI} alt="" className="h-8 w-8 rounded-full border-2 border-card" />
            ) : (
              <div className="h-8 w-8 rounded-full bg-muted border-2 border-card flex items-center justify-center text-xs">
                {inputToken.symbol.slice(0, 2)}
              </div>
            )}
            {outputToken.logoURI ? (
              <img src={outputToken.logoURI} alt="" className="h-8 w-8 rounded-full border-2 border-card" />
            ) : (
              <div className="h-8 w-8 rounded-full bg-muted border-2 border-card flex items-center justify-center text-xs">
                {outputToken.symbol.slice(0, 2)}
              </div>
            )}
          </div>
          <div>
            <p className="font-medium">{inputToken.symbol} → {outputToken.symbol}</p>
            <p className="text-xs text-muted-foreground">
              {config.amount_per_trade} per trade · every {config.frequency_hours}h
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {isUnderfunded && (
            <div className="w-5 h-5 rounded-full bg-orange-500/20 flex items-center justify-center" title="Low balance">
              <span className="text-orange-400 text-xs font-medium">!</span>
            </div>
          )}
          <div className="flex items-center gap-1.5">
            <span className={`w-1.5 h-1.5 rounded-full ${isActive ? 'bg-green-500' : isPaused ? 'bg-yellow-500' : 'bg-muted-foreground'}`} />
            <span className="text-xs text-muted-foreground capitalize">{config.status}</span>
          </div>
          <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
        </div>
      </button>

      {isExpanded && (
        <div className="px-4 pb-4 pt-2 border-t border-border">
          <div className="mb-4">
            <div className="flex justify-between text-xs mb-1.5">
              <span className="text-muted-foreground">Progress</span>
              <span className="text-mono">{config.completed_trades}/{config.total_trades}</span>
            </div>
            <div className="h-1.5 bg-muted rounded-full overflow-hidden">
              <div className="h-full bg-accent rounded-full" style={{ width: `${progress}%` }} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 mb-4 text-sm">
            <div>
              <p className="text-xs text-muted-foreground mb-0.5">Next execution</p>
              <p className="font-medium">
                {isActive ? formatDistanceToNow(new Date(config.next_execution), { addSuffix: true }) : '—'}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-0.5">Deployed</p>
              <p className="font-medium text-mono">
                {(config.completed_trades * config.amount_per_trade).toFixed(2)} {inputToken.symbol}
              </p>
            </div>
          </div>

          {/* Funding note - only shown when underfunded */}
          {isUnderfunded && fundingStatus && (
            <div className="flex items-center gap-2 text-xs text-orange-400/90 mb-4">
              <div className="w-1 h-1 rounded-full bg-orange-400/90" />
              <span>Low balance — needs ${config.amount_per_trade}, short ${fundingStatus.shortfall.toFixed(2)}</span>
            </div>
          )}

          <div className="flex gap-2">
            {isActive && (
              <Button variant="outline" size="sm" onClick={() => onPause(config.id)} className="gap-1.5 text-xs">
                <Pause className="h-3 w-3" /> Pause
              </Button>
            )}
            {isPaused && (
              <Button variant="outline" size="sm" onClick={() => onResume(config.id)} className="gap-1.5 text-xs">
                <Play className="h-3 w-3" /> Resume
              </Button>
            )}
            <Button variant="ghost" size="sm" onClick={() => onCancel(config.id)} className="gap-1.5 text-xs text-destructive hover:bg-destructive/10 hover:!text-destructive">
              <X className="h-3 w-3" /> Cancel
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
