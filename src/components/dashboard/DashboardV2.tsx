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
  ArrowDownLeft,
  ArrowUpRight,
  Check,
  X,
  Copy,
  ExternalLink,
  Pause,
  Play,
  RefreshCw,
  ChevronRight,
  TrendingUp,
  Shield,
  Eye,
  EyeOff,
  Sparkles,
  Clock,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  HelpCircle,
  Settings,
  Wallet,
} from 'lucide-react';
import { formatDistanceToNow, format } from 'date-fns';
import { TOKENS, USDC_MINT } from '@/lib/solana/constants';
import { getExplorerUrl, getConnection } from '@/lib/solana/connection';
import type { DCAConfig, Execution } from '@/types';
import { LAMPORTS_PER_SOL, PublicKey } from '@solana/web3.js';
import { getAssociatedTokenAddress } from '@solana/spl-token';

function getTokenInfo(mint: string) {
  const token = Object.values(TOKENS).find((t) => t.mint === mint);
  return token || { symbol: mint.slice(0, 4), name: 'Unknown', decimals: 9, mint, logoURI: undefined };
}

export function DashboardV2() {
  const { publicKey } = useWallet();
  const {
    balances,
    isLoading: balancesLoading,
    hasFetched: hasFetchedBalances,
    fetchBalances,
    deposit,
    withdraw,
    getSessionPublicKey,
    isInitialized,
  } = useShieldedBalance();
  const {
    isLoading: configsLoading,
    getActiveConfigs,
    getPausedConfigs,
    pauseDCA,
    resumeDCA,
    cancelDCA,
  } = useDCAConfigs();
  const { setCreateModalOpen } = useAppStore();

  // UI State
  const [showDepositFlow, setShowDepositFlow] = useState(false);
  const [showWithdrawFlow, setShowWithdrawFlow] = useState(false);
  const [depositAmount, setDepositAmount] = useState('');
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [balanceHidden, setBalanceHidden] = useState(false);
  const [sessionKey, setSessionKey] = useState<string | null>(null);
  const [sessionBalance, setSessionBalance] = useState<number | null>(null);
  const [sessionUsdcBalance, setSessionUsdcBalance] = useState<number | null>(null);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [recentExecutions, setRecentExecutions] = useState<Array<Execution & { input_token: string; output_token: string }>>([]);
  const [copied, setCopied] = useState(false);
  const [depositStep, setDepositStep] = useState<'amount' | 'funding' | 'processing' | 'complete'>('amount');
  const [needsFunding, setNeedsFunding] = useState(false);

  const isMounted = useRef(true);

  useEffect(() => {
    isMounted.current = true;
    return () => { isMounted.current = false; };
  }, []);

  const activeConfigs = getActiveConfigs();
  const pausedConfigs = getPausedConfigs();
  const allStrategies = [...activeConfigs, ...pausedConfigs];

  // Combined balance: shielded + session wallet tokens
  const shieldedTotal = balances.reduce((acc, b) => acc + (b.usdValue || 0), 0);
  const sessionUsdcValue = sessionUsdcBalance || 0;
  const totalBalance = shieldedTotal + sessionUsdcValue;

  // Calculate total accumulated from DCA
  const totalAccumulated = allStrategies.reduce((acc, config) => {
    return acc + (config.completed_trades * config.amount_per_trade);
  }, 0);

  // Check if user needs to complete setup
  const hasBalance = totalBalance > 0;
  const hasStrategies = allStrategies.length > 0;
  const isNewUser = !hasBalance && !hasStrategies;

  // Fetch session info
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

          // Check if needs funding for gas
          setNeedsFunding(balance < 0.01 * LAMPORTS_PER_SOL);

          // Fetch USDC balance
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
        } catch (e) {
          console.error('Failed to fetch session balance:', e);
          if (isMounted.current) {
            setSessionBalance(0);
            setSessionUsdcBalance(0);
          }
        }
      }).catch(console.error);
    }
  }, [isInitialized, sessionKey, getSessionPublicKey]);

  // Refresh balances periodically
  useEffect(() => {
    if (!sessionKey) return;
    const interval = setInterval(async () => {
      if (!isMounted.current) return;
      try {
        const connection = getConnection();
        const balance = await connection.getBalance(new PublicKey(sessionKey));
        if (isMounted.current) {
          setSessionBalance(balance / LAMPORTS_PER_SOL);
          setNeedsFunding(balance < 0.01 * LAMPORTS_PER_SOL);
        }

        const usdcMint = new PublicKey(USDC_MINT);
        const ata = await getAssociatedTokenAddress(usdcMint, new PublicKey(sessionKey));
        const accountInfo = await connection.getAccountInfo(ata);
        if (accountInfo && isMounted.current) {
          const data = accountInfo.data;
          const usdcBalance = data.readBigUInt64LE(64);
          setSessionUsdcBalance(Number(usdcBalance) / 1e6);
        }
      } catch (e) {
        console.error('Failed to refresh balance:', e);
      }
    }, 15000);
    return () => clearInterval(interval);
  }, [sessionKey]);

  // Fetch executions
  useEffect(() => {
    if (publicKey && hasStrategies) {
      fetchRecentExecutions();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [publicKey, hasStrategies]);

  const fetchRecentExecutions = async () => {
    if (!publicKey || !isMounted.current) return;
    try {
      const walletAddress = publicKey.toBase58();
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
    if (!depositAmount || isNaN(Number(depositAmount))) return;

    // Check if session wallet needs SOL for gas
    if (needsFunding) {
      setDepositStep('funding');
      return;
    }

    setIsProcessing(true);
    setDepositStep('processing');

    try {
      const usdcMint = balances[0]?.token.mint || USDC_MINT;
      await deposit(usdcMint, Number(depositAmount));
      if (!isMounted.current) return;

      setDepositStep('complete');
      setDepositAmount('');

      // Refresh balances
      setTimeout(() => {
        if (isMounted.current) {
          fetchBalances(true);
        }
      }, 3000);
    } catch (error) {
      console.error('Deposit failed:', error);
      setDepositStep('amount');
    } finally {
      if (isMounted.current) setIsProcessing(false);
    }
  };

  const handleWithdraw = async () => {
    if (!withdrawAmount || !publicKey) return;
    setIsProcessing(true);
    try {
      const token = balances.find(b => b.amount > 0)?.token.mint || USDC_MINT;
      await withdraw(token, Number(withdrawAmount), publicKey.toBase58());
      if (!isMounted.current) return;
      setWithdrawAmount('');
      setShowWithdrawFlow(false);
      fetchBalances(true);
    } catch (error) {
      console.error('Withdraw failed:', error);
    } finally {
      if (isMounted.current) setIsProcessing(false);
    }
  };

  const copyAddress = (address: string) => {
    navigator.clipboard.writeText(address);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Loading state
  if (!hasFetchedBalances || sessionBalance === null) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="relative w-12 h-12 mx-auto mb-4">
            <div className="absolute inset-0 rounded-full border-2 border-muted" />
            <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-accent animate-spin" />
          </div>
          <p className="text-sm text-muted-foreground">Loading your private vault...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-20 pb-24">
      <div className="max-w-2xl mx-auto px-6">

        {/* Hero Balance Section */}
        <section className="mb-12 animate-in" style={{ animationDelay: '0ms' }}>
          {/* Privacy Badge */}
          <div className="flex items-center gap-2 mb-6">
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-accent/10 border border-accent/20">
              <Shield className="h-3 w-3 text-accent" />
              <span className="text-xs font-medium text-accent">Private</span>
            </div>
            <button
              onClick={() => setBalanceHidden(!balanceHidden)}
              className="p-1.5 rounded-full hover:bg-muted transition-colors"
            >
              {balanceHidden ? <EyeOff className="h-4 w-4 text-muted-foreground" /> : <Eye className="h-4 w-4 text-muted-foreground" />}
            </button>
          </div>

          {/* Balance Display */}
          <div className="mb-8">
            <p className="text-sm text-muted-foreground mb-2">Total Balance</p>
            <div className="flex items-baseline gap-3">
              <span className="text-5xl font-light tracking-tight">
                {balanceHidden ? (
                  <span className="text-muted-foreground">••••••</span>
                ) : (
                  <>
                    <span className="text-muted-foreground">$</span>
                    {totalBalance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </>
                )}
              </span>
              {!balanceHidden && hasStrategies && (
                <span className="text-sm text-green-500 flex items-center gap-1">
                  <TrendingUp className="h-3 w-3" />
                  Active
                </span>
              )}
            </div>
          </div>

          {/* Quick Actions */}
          <div className="flex gap-3">
            <Button
              onClick={() => {
                setShowDepositFlow(true);
                setShowWithdrawFlow(false);
                setDepositStep('amount');
              }}
              className="flex-1 gap-2 h-12 bg-accent hover:bg-accent/90 text-accent-foreground"
            >
              <ArrowDownLeft className="h-4 w-4" />
              Add Funds
            </Button>
            <Button
              onClick={() => {
                setShowWithdrawFlow(true);
                setShowDepositFlow(false);
              }}
              variant="outline"
              className="flex-1 gap-2 h-12"
              disabled={totalBalance <= 0}
            >
              <ArrowUpRight className="h-4 w-4" />
              Withdraw
            </Button>
          </div>
        </section>

        {/* Deposit Flow */}
        {showDepositFlow && (
          <section className="mb-12 animate-in" style={{ animationDelay: '50ms' }}>
            <div className="rounded-xl bg-card border border-border overflow-hidden">
              {/* Header */}
              <div className="flex items-center justify-between p-4 border-b border-border">
                <h3 className="font-medium">Add Funds</h3>
                <button
                  onClick={() => {
                    setShowDepositFlow(false);
                    setDepositStep('amount');
                  }}
                  className="p-1.5 rounded-lg hover:bg-muted transition-colors"
                >
                  <X className="h-4 w-4 text-muted-foreground" />
                </button>
              </div>

              {/* Content */}
              <div className="p-5">
                {depositStep === 'amount' && (
                  <div className="space-y-4">
                    <div>
                      <label className="text-sm text-muted-foreground mb-2 block">Amount (USDC)</label>
                      <input
                        type="number"
                        value={depositAmount}
                        onChange={(e) => setDepositAmount(e.target.value)}
                        placeholder="0.00"
                        className="w-full px-4 py-3 text-2xl font-light bg-background border border-border rounded-lg text-center focus:border-accent focus:outline-none"
                        autoFocus
                      />
                    </div>

                    {/* Quick amounts */}
                    <div className="flex gap-2">
                      {[10, 50, 100, 500].map((amount) => (
                        <button
                          key={amount}
                          onClick={() => setDepositAmount(amount.toString())}
                          className="flex-1 py-2 px-3 text-sm font-medium rounded-lg bg-muted hover:bg-muted/80 transition-colors"
                        >
                          ${amount}
                        </button>
                      ))}
                    </div>

                    {/* Info */}
                    <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50 text-sm">
                      <Sparkles className="h-4 w-4 text-accent mt-0.5 shrink-0" />
                      <p className="text-muted-foreground">
                        Funds are deposited into a private pool. Your DCA trades execute privately - no one can trace them to your wallet.
                      </p>
                    </div>

                    <Button
                      onClick={handleDeposit}
                      disabled={!depositAmount || Number(depositAmount) <= 0}
                      className="w-full h-12 bg-accent hover:bg-accent/90 text-accent-foreground"
                    >
                      Continue
                    </Button>
                  </div>
                )}

                {depositStep === 'funding' && (
                  <div className="space-y-4">
                    <div className="text-center py-4">
                      <div className="w-12 h-12 rounded-full bg-accent/10 flex items-center justify-center mx-auto mb-4">
                        <Wallet className="h-6 w-6 text-accent" />
                      </div>
                      <h4 className="font-medium mb-2">Quick Setup Required</h4>
                      <p className="text-sm text-muted-foreground">
                        Send a small amount of SOL (~0.05) to cover transaction fees for your DCA trades.
                      </p>
                    </div>

                    <div className="p-4 rounded-lg bg-muted/50">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs text-muted-foreground">Send SOL to:</span>
                        <button
                          onClick={() => copyAddress(sessionKey || '')}
                          className="text-xs text-accent hover:text-accent/80 flex items-center gap-1"
                        >
                          {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                          {copied ? 'Copied!' : 'Copy'}
                        </button>
                      </div>
                      <code className="text-xs text-mono break-all block">{sessionKey}</code>
                    </div>

                    <div className="flex items-center justify-between p-3 rounded-lg border border-border">
                      <span className="text-sm text-muted-foreground">Current SOL Balance</span>
                      <span className="text-sm font-mono">{sessionBalance?.toFixed(4)} SOL</span>
                    </div>

                    <Button
                      onClick={async () => {
                        // Refresh balance check
                        if (sessionKey) {
                          const connection = getConnection();
                          const balance = await connection.getBalance(new PublicKey(sessionKey));
                          setSessionBalance(balance / LAMPORTS_PER_SOL);
                          if (balance >= 0.01 * LAMPORTS_PER_SOL) {
                            setNeedsFunding(false);
                            setDepositStep('amount');
                          }
                        }
                      }}
                      variant="outline"
                      className="w-full gap-2"
                    >
                      <RefreshCw className="h-4 w-4" />
                      I've sent SOL - Check Balance
                    </Button>
                  </div>
                )}

                {depositStep === 'processing' && (
                  <div className="text-center py-8">
                    <div className="relative w-16 h-16 mx-auto mb-4">
                      <div className="absolute inset-0 rounded-full border-2 border-muted" />
                      <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-accent animate-spin" />
                    </div>
                    <h4 className="font-medium mb-2">Processing Deposit</h4>
                    <p className="text-sm text-muted-foreground">
                      Shielding your funds into the private pool...
                    </p>
                  </div>
                )}

                {depositStep === 'complete' && (
                  <div className="text-center py-8">
                    <div className="w-16 h-16 rounded-full bg-green-500/10 flex items-center justify-center mx-auto mb-4">
                      <CheckCircle2 className="h-8 w-8 text-green-500" />
                    </div>
                    <h4 className="font-medium mb-2">Deposit Complete!</h4>
                    <p className="text-sm text-muted-foreground mb-6">
                      Your funds are now private and ready for DCA.
                    </p>
                    <div className="flex gap-3">
                      <Button
                        onClick={() => {
                          setShowDepositFlow(false);
                          setDepositStep('amount');
                        }}
                        variant="outline"
                        className="flex-1"
                      >
                        Done
                      </Button>
                      <Button
                        onClick={() => {
                          setShowDepositFlow(false);
                          setDepositStep('amount');
                          setCreateModalOpen(true);
                        }}
                        className="flex-1 bg-accent hover:bg-accent/90 text-accent-foreground"
                      >
                        Create DCA
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </section>
        )}

        {/* Withdraw Flow */}
        {showWithdrawFlow && (
          <section className="mb-12 animate-in" style={{ animationDelay: '50ms' }}>
            <div className="rounded-xl bg-card border border-border overflow-hidden">
              <div className="flex items-center justify-between p-4 border-b border-border">
                <h3 className="font-medium">Withdraw Funds</h3>
                <button
                  onClick={() => setShowWithdrawFlow(false)}
                  className="p-1.5 rounded-lg hover:bg-muted transition-colors"
                >
                  <X className="h-4 w-4 text-muted-foreground" />
                </button>
              </div>

              <div className="p-5 space-y-4">
                <div>
                  <label className="text-sm text-muted-foreground mb-2 block">Amount (USDC)</label>
                  <input
                    type="number"
                    value={withdrawAmount}
                    onChange={(e) => setWithdrawAmount(e.target.value)}
                    placeholder="0.00"
                    max={shieldedTotal}
                    className="w-full px-4 py-3 text-2xl font-light bg-background border border-border rounded-lg text-center focus:border-accent focus:outline-none"
                    autoFocus
                  />
                  <p className="text-xs text-muted-foreground text-center mt-2">
                    Available: ${shieldedTotal.toFixed(2)}
                  </p>
                </div>

                <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50 text-sm">
                  <AlertTriangle className="h-4 w-4 text-yellow-500 mt-0.5 shrink-0" />
                  <p className="text-muted-foreground">
                    Withdrawing will send funds to your connected wallet, making them visible on-chain.
                  </p>
                </div>

                <Button
                  onClick={handleWithdraw}
                  disabled={!withdrawAmount || Number(withdrawAmount) <= 0 || isProcessing}
                  className="w-full h-12"
                >
                  {isProcessing ? 'Processing...' : 'Withdraw to Wallet'}
                </Button>
              </div>
            </div>
          </section>
        )}

        {/* Strategies Section */}
        <section className="mb-12 animate-in" style={{ animationDelay: '100ms' }}>
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-lg font-medium">DCA Strategies</h2>
            <Button
              onClick={() => setCreateModalOpen(true)}
              size="sm"
              className="gap-2 bg-accent hover:bg-accent/90 text-accent-foreground"
              disabled={totalBalance <= 0}
            >
              <Plus className="h-4 w-4" />
              New
            </Button>
          </div>

          {allStrategies.length === 0 ? (
            <div className="rounded-xl border-2 border-dashed border-border p-10 text-center">
              {totalBalance > 0 ? (
                <>
                  <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
                    <TrendingUp className="h-6 w-6 text-muted-foreground" />
                  </div>
                  <h3 className="font-medium mb-2">Create Your First DCA</h3>
                  <p className="text-sm text-muted-foreground mb-6 max-w-sm mx-auto">
                    Automatically accumulate crypto at regular intervals. Your trades are private and untraceable.
                  </p>
                  <Button
                    onClick={() => setCreateModalOpen(true)}
                    className="gap-2 bg-accent hover:bg-accent/90 text-accent-foreground"
                  >
                    <Plus className="h-4 w-4" />
                    Create Strategy
                  </Button>
                </>
              ) : (
                <>
                  <div className="w-12 h-12 rounded-full bg-accent/10 flex items-center justify-center mx-auto mb-4">
                    <ArrowDownLeft className="h-6 w-6 text-accent" />
                  </div>
                  <h3 className="font-medium mb-2">Add Funds to Get Started</h3>
                  <p className="text-sm text-muted-foreground mb-6 max-w-sm mx-auto">
                    Deposit USDC to start creating private DCA strategies.
                  </p>
                  <Button
                    onClick={() => {
                      setShowDepositFlow(true);
                      setDepositStep('amount');
                    }}
                    className="gap-2 bg-accent hover:bg-accent/90 text-accent-foreground"
                  >
                    <ArrowDownLeft className="h-4 w-4" />
                    Add Funds
                  </Button>
                </>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              {allStrategies.map((config) => (
                <StrategyCardV2
                  key={config.id}
                  config={config}
                  onPause={pauseDCA}
                  onResume={resumeDCA}
                  onCancel={cancelDCA}
                />
              ))}
            </div>
          )}
        </section>

        {/* Recent Activity */}
        {recentExecutions.length > 0 && (
          <section className="mb-12 animate-in" style={{ animationDelay: '150ms' }}>
            <h2 className="text-lg font-medium mb-5">Recent Trades</h2>
            <div className="rounded-xl bg-card border border-border overflow-hidden">
              {recentExecutions.map((exec, i) => {
                const inputToken = getTokenInfo(exec.input_token);
                const outputToken = getTokenInfo(exec.output_token);
                const isSuccess = exec.status === 'success';

                return (
                  <div
                    key={exec.id}
                    className={`flex items-center justify-between p-4 ${i < recentExecutions.length - 1 ? 'border-b border-border' : ''}`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                        isSuccess ? 'bg-green-500/10' : 'bg-red-500/10'
                      }`}>
                        {isSuccess ? (
                          <CheckCircle2 className="h-4 w-4 text-green-500" />
                        ) : (
                          <XCircle className="h-4 w-4 text-red-500" />
                        )}
                      </div>
                      <div>
                        <p className="text-sm font-medium">
                          {exec.input_amount} {inputToken.symbol}
                          <span className="text-muted-foreground mx-1.5">→</span>
                          {exec.output_amount?.toFixed(4) || '—'} {outputToken.symbol}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {format(new Date(exec.executed_at), 'MMM d, h:mm a')}
                        </p>
                      </div>
                    </div>
                    {exec.tx_signature && (
                      <a
                        href={getExplorerUrl(exec.tx_signature)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-2 rounded-lg hover:bg-muted transition-colors"
                      >
                        <ExternalLink className="h-4 w-4 text-muted-foreground" />
                      </a>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* Advanced Options (collapsed) */}
        <section className="animate-in" style={{ animationDelay: '200ms' }}>
          <button
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <Settings className="h-4 w-4" />
            <span>Advanced</span>
            <ChevronRight className={`h-4 w-4 transition-transform ${showAdvanced ? 'rotate-90' : ''}`} />
          </button>

          {showAdvanced && (
            <div className="mt-4 p-4 rounded-lg bg-card border border-border space-y-4">
              <div>
                <p className="text-xs text-muted-foreground mb-2">Session Wallet</p>
                <div className="flex items-center justify-between">
                  <code className="text-xs text-mono">{sessionKey?.slice(0, 20)}...{sessionKey?.slice(-8)}</code>
                  <button
                    onClick={() => copyAddress(sessionKey || '')}
                    className="text-xs text-accent hover:text-accent/80 flex items-center gap-1"
                  >
                    {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Gas Reserve (SOL)</span>
                <span className="font-mono">{sessionBalance?.toFixed(4)}</span>
              </div>

              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Unshielded USDC</span>
                <span className="font-mono">{sessionUsdcBalance?.toFixed(2)}</span>
              </div>

              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Shielded Balance</span>
                <span className="font-mono">${shieldedTotal.toFixed(2)}</span>
              </div>

              <button
                onClick={() => fetchBalances(true)}
                disabled={balancesLoading}
                className="w-full py-2 text-sm text-muted-foreground hover:text-foreground flex items-center justify-center gap-2 transition-colors"
              >
                <RefreshCw className={`h-4 w-4 ${balancesLoading ? 'animate-spin' : ''}`} />
                Refresh Balances
              </button>
            </div>
          )}
        </section>

      </div>

      <CreateDCAModal />
    </div>
  );
}

// Simplified Strategy Card
function StrategyCardV2({
  config,
  onPause,
  onResume,
  onCancel,
}: {
  config: DCAConfig;
  onPause: (id: string) => Promise<void>;
  onResume: (id: string) => Promise<void>;
  onCancel: (id: string) => Promise<void>;
}) {
  const [expanded, setExpanded] = useState(false);
  const inputToken = getTokenInfo(config.input_token);
  const outputToken = getTokenInfo(config.output_token);
  const progress = (config.completed_trades / config.total_trades) * 100;
  const isActive = config.status === 'active';
  const isPaused = config.status === 'paused';

  const frequencyLabel = {
    1: 'Hourly',
    4: 'Every 4h',
    12: 'Every 12h',
    24: 'Daily',
    168: 'Weekly',
  }[config.frequency_hours] || `Every ${config.frequency_hours}h`;

  return (
    <div className="rounded-xl bg-card border border-border overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full p-4 flex items-center justify-between text-left hover:bg-muted/30 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="flex -space-x-2">
            {inputToken.logoURI ? (
              <img src={inputToken.logoURI} alt="" className="h-10 w-10 rounded-full border-2 border-card" />
            ) : (
              <div className="h-10 w-10 rounded-full bg-muted border-2 border-card flex items-center justify-center text-xs font-medium">
                {inputToken.symbol.slice(0, 2)}
              </div>
            )}
            {outputToken.logoURI ? (
              <img src={outputToken.logoURI} alt="" className="h-10 w-10 rounded-full border-2 border-card" />
            ) : (
              <div className="h-10 w-10 rounded-full bg-muted border-2 border-card flex items-center justify-center text-xs font-medium">
                {outputToken.symbol.slice(0, 2)}
              </div>
            )}
          </div>
          <div>
            <p className="font-medium">{inputToken.symbol} → {outputToken.symbol}</p>
            <p className="text-xs text-muted-foreground">
              ${config.amount_per_trade} · {frequencyLabel}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className={`px-2.5 py-1 rounded-full text-xs font-medium flex items-center gap-1.5 ${
            isActive ? 'bg-green-500/10 text-green-500' : isPaused ? 'bg-yellow-500/10 text-yellow-500' : 'bg-muted text-muted-foreground'
          }`}>
            <span className={`w-1.5 h-1.5 rounded-full ${
              isActive ? 'bg-green-500' : isPaused ? 'bg-yellow-500' : 'bg-muted-foreground'
            }`} />
            {isActive ? 'Active' : isPaused ? 'Paused' : config.status}
          </div>
          <ChevronRight className={`h-4 w-4 text-muted-foreground transition-transform ${expanded ? 'rotate-90' : ''}`} />
        </div>
      </button>

      {expanded && (
        <div className="px-4 pb-4 pt-2 border-t border-border">
          {/* Progress */}
          <div className="mb-4">
            <div className="flex justify-between text-xs mb-2">
              <span className="text-muted-foreground">Progress</span>
              <span className="font-mono">{config.completed_trades}/{config.total_trades}</span>
            </div>
            <div className="h-2 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-accent to-accent/80 rounded-full transition-all duration-500"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div className="p-3 rounded-lg bg-muted/50">
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
                <Clock className="h-3 w-3" />
                Next Trade
              </div>
              <p className="text-sm font-medium">
                {isActive && config.next_execution
                  ? formatDistanceToNow(new Date(config.next_execution), { addSuffix: true })
                  : '—'
                }
              </p>
            </div>
            <div className="p-3 rounded-lg bg-muted/50">
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
                <TrendingUp className="h-3 w-3" />
                Deployed
              </div>
              <p className="text-sm font-medium font-mono">
                ${(config.completed_trades * config.amount_per_trade).toFixed(2)}
              </p>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-2">
            {isActive && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => onPause(config.id)}
                className="flex-1 gap-1.5"
              >
                <Pause className="h-3.5 w-3.5" />
                Pause
              </Button>
            )}
            {isPaused && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => onResume(config.id)}
                className="flex-1 gap-1.5"
              >
                <Play className="h-3.5 w-3.5" />
                Resume
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onCancel(config.id)}
              className="gap-1.5 text-destructive hover:bg-destructive/10 hover:text-destructive"
            >
              <X className="h-3.5 w-3.5" />
              Cancel
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
