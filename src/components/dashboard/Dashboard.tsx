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
  Circle,
  ArrowRight,
  Zap,
  AlertCircle,
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

// Onboarding step type
type OnboardingStep = 'fund_session' | 'transfer_usdc' | 'shield_tokens' | 'create_strategy' | 'complete';

export function Dashboard() {
  const { publicKey } = useWallet();
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
  const [depositSuccess, setDepositSuccess] = useState(false);
  const [depositTx, setDepositTx] = useState<string | null>(null);

  // Track mounted state to prevent state updates after unmount
  const isMounted = useRef(true);
  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
    };
  }, []);

  const activeConfigs = getActiveConfigs();
  const pausedConfigs = getPausedConfigs();
  const allStrategies = [...activeConfigs, ...pausedConfigs];

  const totalShielded = balances.reduce((acc, b) => acc + (b.usdValue || 0), 0);
  const hasShieldedBalance = totalShielded > 0;
  const hasStrategies = allStrategies.length > 0;
  const sessionFunded = sessionBalance !== null && sessionBalance >= 0.01; // At least 0.01 SOL
  const sessionHasUsdc = sessionUsdcBalance !== null && sessionUsdcBalance > 0; // Any USDC

  // Determine onboarding step
  const getOnboardingStep = (): OnboardingStep => {
    if (!sessionFunded) return 'fund_session';

    // If user already has shielded balance OR just completed a deposit, skip to strategy creation
    if (hasShieldedBalance || depositSuccess) {
      if (!hasStrategies) return 'create_strategy';
      return 'complete';
    }

    // No shielded balance yet - check if they need to transfer USDC
    if (!sessionHasUsdc) return 'transfer_usdc';
    return 'shield_tokens';
  };

  // Wait for initial data to load before deciding onboarding state
  const isInitialLoading = !hasFetchedBalances || sessionBalance === null;

  const onboardingStep = getOnboardingStep();
  const isOnboarding = onboardingStep !== 'complete';

  // Fetch session key and balance
  useEffect(() => {
    if (isInitialized && !sessionKey) {
      getSessionPublicKey().then(async (key) => {
        if (!isMounted.current) return;
        setSessionKey(key);
        // Fetch SOL balance of session wallet
        try {
          const connection = getConnection();
          const balance = await connection.getBalance(new PublicKey(key));
          if (!isMounted.current) return;
          setSessionBalance(balance / LAMPORTS_PER_SOL);
        } catch (e) {
          console.error('Failed to fetch session balance:', e);
          if (isMounted.current) setSessionBalance(0);
        }
      }).catch(console.error);
    }
  }, [isInitialized, sessionKey, getSessionPublicKey]);

  // Fetch session wallet USDC balance
  useEffect(() => {
    if (!sessionKey) return;
    const fetchUsdcBalance = async () => {
      try {
        const connection = getConnection();
        const sessionPubkey = new PublicKey(sessionKey);
        const usdcMint = new PublicKey(USDC_MINT);
        const ata = await getAssociatedTokenAddress(usdcMint, sessionPubkey);
        const accountInfo = await connection.getAccountInfo(ata);
        if (!isMounted.current) return;
        if (accountInfo) {
          const data = accountInfo.data;
          const balance = data.readBigUInt64LE(64);
          setSessionUsdcBalance(Number(balance) / 1e6);
        } else {
          setSessionUsdcBalance(0);
        }
      } catch (e) {
        console.error('Failed to fetch session USDC balance:', e);
        if (isMounted.current) setSessionUsdcBalance(0);
      }
    };
    fetchUsdcBalance();
  }, [sessionKey]);

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
        const sessionPubkey = new PublicKey(sessionKey);
        const usdcMint = new PublicKey(USDC_MINT);
        const ata = await getAssociatedTokenAddress(usdcMint, sessionPubkey);
        const accountInfo = await connection.getAccountInfo(ata);
        if (!isMounted.current) return;
        if (accountInfo) {
          const data = accountInfo.data;
          const usdcBalance = data.readBigUInt64LE(64);
          setSessionUsdcBalance(Number(usdcBalance) / 1e6);
        }
      } catch (e) {
        console.error('Failed to refresh session balance:', e);
      }
    }, 30000);
    return () => clearInterval(interval);
  }, [sessionKey]);

  // Fetch recent executions
  useEffect(() => {
    if (publicKey && !isOnboarding) {
      fetchRecentExecutions();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [publicKey, isOnboarding]);

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
    setIsDepositing(true);
    setDepositSuccess(false);
    try {
      const usdcMint = balances[0]?.token.mint || 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v';
      const result = await deposit(usdcMint, Number(depositAmount));
      if (!isMounted.current) return;
      setDepositAmount('');
      setShowDeposit(false);
      setDepositSuccess(true);
      setDepositTx(result?.signature || null);

      // Give the indexer time to process the deposit before refreshing
      const delays = [3000, 5000, 8000];
      for (const delay of delays) {
        if (!isMounted.current) return;
        await new Promise(resolve => setTimeout(resolve, delay));
        if (!isMounted.current) return;
        await fetchBalances(true);
      }
    } catch (error) {
      console.error('Deposit failed:', error);
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

  // Show loading state while fetching initial data
  if (isInitialLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="relative">
          <div className="h-10 w-10 rounded-full border-2 border-muted" />
          <div className="absolute inset-0 h-10 w-10 rounded-full border-2 border-transparent border-t-accent animate-spin" />
        </div>
      </div>
    );
  }

  // Show onboarding if not complete
  if (isOnboarding) {
    return (
      <div className="min-h-screen pt-24 pb-20">
        <div className="max-w-xl mx-auto px-6">
          <OnboardingFlow
            step={onboardingStep}
            sessionKey={sessionKey}
            sessionBalance={sessionBalance}
            sessionUsdcBalance={sessionUsdcBalance}
            onCopySessionKey={copySessionKey}
            copied={copied}
            onShieldClick={() => setShowDeposit(true)}
            showDeposit={showDeposit}
            depositAmount={depositAmount}
            setDepositAmount={setDepositAmount}
            onDeposit={handleDeposit}
            isDepositing={isDepositing}
            depositSuccess={depositSuccess}
            depositTx={depositTx}
            onCreateStrategy={() => setCreateModalOpen(true)}
            onRefreshBalance={async () => {
              if (sessionKey) {
                const connection = getConnection();
                const balance = await connection.getBalance(new PublicKey(sessionKey));
                setSessionBalance(balance / LAMPORTS_PER_SOL);
                // Also refresh USDC balance
                const sessionPubkey = new PublicKey(sessionKey);
                const usdcMint = new PublicKey(USDC_MINT);
                const ata = await getAssociatedTokenAddress(usdcMint, sessionPubkey);
                const accountInfo = await connection.getAccountInfo(ata);
                if (accountInfo) {
                  const data = accountInfo.data;
                  const usdcBalance = data.readBigUInt64LE(64);
                  setSessionUsdcBalance(Number(usdcBalance) / 1e6);
                } else {
                  setSessionUsdcBalance(0);
                }
              }
            }}
            onRefreshShieldedBalance={() => fetchBalances(true)}
          />
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
            <p className="text-sm text-muted-foreground">Shielded Balance</p>
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
              Shield
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
              Unshield
            </Button>
          </div>

          {/* Deposit Panel */}
          {showDeposit && (
            <div className="mt-4 p-5 rounded-lg bg-card border border-border">
              <p className="text-sm text-muted-foreground mb-3">Deposit USDC into the privacy pool</p>
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
                  {isDepositing ? 'Shielding...' : 'Confirm'}
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
              {allStrategies.map((config) => (
                <StrategyCard
                  key={config.id}
                  config={config}
                  isExpanded={expandedStrategy === config.id}
                  onToggle={() => setExpandedStrategy(expandedStrategy === config.id ? null : config.id)}
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
          <section className="mb-14">
            <h2 className="text-lg font-medium mb-5">Recent Activity</h2>
            <div className="space-y-1">
              {recentExecutions.map((exec) => {
                const inputToken = getTokenInfo(exec.input_token);
                const outputToken = getTokenInfo(exec.output_token);
                const isSuccess = exec.status === 'success';

                return (
                  <div key={exec.id} className="flex items-center justify-between py-3 border-b border-border last:border-0">
                    <div className="flex items-center gap-3">
                      <div className={`w-1.5 h-1.5 rounded-full ${isSuccess ? 'bg-green-500' : 'bg-red-500'}`} />
                      <div>
                        <p className="text-sm">
                          <span className="font-medium">{exec.input_amount} {inputToken.symbol}</span>
                          <span className="text-muted-foreground mx-1.5">→</span>
                          <span className="font-medium">{exec.output_amount?.toFixed(4) || '—'} {outputToken.symbol}</span>
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
                        className="text-muted-foreground hover:text-accent transition-colors p-1.5"
                      >
                        <ExternalLink className="h-3.5 w-3.5" />
                      </a>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* Session Wallet (collapsed by default, shown as small footer) */}
        {sessionKey && (
          <section className="pt-6 border-t border-border">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Wallet className="h-4 w-4" />
                <span>Session Wallet</span>
                <span className="text-mono text-xs">{sessionBalance?.toFixed(4) || '0'} SOL</span>
              </div>
              <button
                onClick={copySessionKey}
                className="text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
              >
                {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                {copied ? 'Copied' : 'Copy address'}
              </button>
            </div>
          </section>
        )}

      </div>

      <CreateDCAModal />
    </div>
  );
}

// Onboarding Flow Component
function OnboardingFlow({
  step,
  sessionKey,
  sessionBalance,
  sessionUsdcBalance,
  onCopySessionKey,
  copied,
  onShieldClick,
  showDeposit,
  depositAmount,
  setDepositAmount,
  onDeposit,
  isDepositing,
  depositSuccess,
  depositTx,
  onCreateStrategy,
  onRefreshBalance,
  onRefreshShieldedBalance,
}: {
  step: OnboardingStep;
  sessionKey: string | null;
  sessionBalance: number | null;
  sessionUsdcBalance: number | null;
  onCopySessionKey: () => void;
  copied: boolean;
  onShieldClick: () => void;
  showDeposit: boolean;
  depositAmount: string;
  setDepositAmount: (v: string) => void;
  onDeposit: () => void;
  isDepositing: boolean;
  depositSuccess: boolean;
  depositTx: string | null;
  onCreateStrategy: () => void;
  onRefreshBalance: () => void;
  onRefreshShieldedBalance: () => void;
}) {
  const steps = [
    { id: 'fund_session', label: 'Fund Session', description: 'Add SOL for gas fees' },
    { id: 'transfer_usdc', label: 'Transfer USDC', description: 'Send USDC to session wallet' },
    { id: 'shield_tokens', label: 'Shield Tokens', description: 'Deposit into privacy pool' },
    { id: 'create_strategy', label: 'Create Strategy', description: 'Set up your first DCA' },
  ];

  const currentStepIndex = steps.findIndex(s => s.id === step);

  return (
    <div>
      {/* Header */}
      <div className="text-center mb-10">
        <h1 className="text-2xl font-medium mb-2">Get Started</h1>
        <p className="text-muted-foreground">Complete these steps to start accumulating privately</p>
      </div>

      {/* Progress Steps */}
      <div className="flex items-center justify-center gap-2 mb-10">
        {steps.map((s, i) => (
          <div key={s.id} className="flex items-center gap-2">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors ${
              i < currentStepIndex
                ? 'bg-green-500/20 text-green-500'
                : i === currentStepIndex
                  ? 'bg-accent text-accent-foreground'
                  : 'bg-muted text-muted-foreground'
            }`}>
              {i < currentStepIndex ? <Check className="h-4 w-4" /> : i + 1}
            </div>
            {i < steps.length - 1 && (
              <div className={`w-12 h-0.5 ${i < currentStepIndex ? 'bg-green-500/50' : 'bg-muted'}`} />
            )}
          </div>
        ))}
      </div>

      {/* Current Step Content */}
      <div className="rounded-xl bg-card border border-border p-6">
        {step === 'fund_session' && (
          <div>
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 rounded-lg bg-accent/10">
                <Wallet className="h-5 w-5 text-accent" />
              </div>
              <div>
                <h2 className="font-medium">Fund Session Wallet</h2>
                <p className="text-sm text-muted-foreground">Send ~0.1 SOL for transaction fees</p>
              </div>
            </div>

            <div className="p-4 rounded-lg bg-muted/50 mb-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-muted-foreground">Session Wallet Address</span>
                <button
                  onClick={onCopySessionKey}
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
                <p className="text-sm text-muted-foreground">Current Balance</p>
                <p className="text-xl font-medium text-mono">{sessionBalance?.toFixed(4) || '0'} SOL</p>
              </div>
              <Button variant="ghost" size="sm" onClick={onRefreshBalance}>
                <RefreshCw className="h-4 w-4" />
              </Button>
            </div>

            <div className="flex items-start gap-2 p-3 rounded-lg bg-accent/5 border border-accent/20 text-sm">
              <AlertCircle className="h-4 w-4 text-accent mt-0.5 shrink-0" />
              <p className="text-muted-foreground">
                Send SOL from your wallet to this address. This covers transaction fees for automatic DCA execution.
              </p>
            </div>
          </div>
        )}

        {step === 'transfer_usdc' && (
          <div>
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 rounded-lg bg-accent/10">
                <ArrowDownToLine className="h-5 w-5 text-accent" />
              </div>
              <div>
                <h2 className="font-medium">Transfer USDC</h2>
                <p className="text-sm text-muted-foreground">Send USDC to your session wallet</p>
              </div>
            </div>

            <p className="text-sm text-muted-foreground mb-4">
              Transfer USDC from your main wallet to your session wallet.
              This USDC will then be shielded into the privacy pool.
            </p>

            <div className="p-4 rounded-lg bg-muted/50 mb-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-muted-foreground">Session Wallet Address</span>
                <button
                  onClick={onCopySessionKey}
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
                <p className="text-sm text-muted-foreground">USDC Balance</p>
                <p className="text-xl font-medium text-mono">{sessionUsdcBalance?.toFixed(2) || '0.00'} USDC</p>
              </div>
              <Button variant="ghost" size="sm" onClick={onRefreshBalance}>
                <RefreshCw className="h-4 w-4" />
              </Button>
            </div>

            <div className="flex items-start gap-2 p-3 rounded-lg bg-accent/5 border border-accent/20 text-sm">
              <AlertCircle className="h-4 w-4 text-accent mt-0.5 shrink-0" />
              <p className="text-muted-foreground">
                Send at least 1 USDC to the session wallet address above. You can do this from your connected wallet or any exchange.
              </p>
            </div>
          </div>
        )}

        {step === 'shield_tokens' && (
          <div>
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 rounded-lg bg-accent/10">
                <ArrowDownToLine className="h-5 w-5 text-accent" />
              </div>
              <div>
                <h2 className="font-medium">Shield Your Tokens</h2>
                <p className="text-sm text-muted-foreground">Deposit USDC into the privacy pool</p>
              </div>
            </div>

            {depositSuccess ? (
              // Success state
              <div>
                <div className="flex items-center gap-3 p-4 rounded-lg bg-green-500/10 border border-green-500/30 mb-4">
                  <Check className="h-5 w-5 text-green-500" />
                  <div>
                    <p className="font-medium text-green-500">Deposit Successful!</p>
                    <p className="text-sm text-muted-foreground">Your USDC has been shielded into the privacy pool.</p>
                  </div>
                </div>

                {depositTx && (
                  <a
                    href={`https://solscan.io/tx/${depositTx}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-sm text-accent hover:underline mb-4"
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                    View transaction on Solscan
                  </a>
                )}

                <p className="text-sm text-muted-foreground mb-4">
                  The indexer is syncing your balance. This may take a few moments.
                  Click below to refresh and continue.
                </p>

                <div className="flex gap-3">
                  <Button variant="outline" onClick={onRefreshShieldedBalance} className="flex-1 gap-2">
                    <RefreshCw className="h-4 w-4" />
                    Refresh Balance
                  </Button>
                  <Button onClick={onCreateStrategy} className="flex-1 gap-2">
                    <ArrowRight className="h-4 w-4" />
                    Continue Anyway
                  </Button>
                </div>
              </div>
            ) : (
              // Normal deposit flow
              <>
                <div className="flex items-center justify-between p-4 rounded-lg border border-border mb-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Session Wallet USDC</p>
                    <p className="text-xl font-medium text-mono">{sessionUsdcBalance?.toFixed(2) || '0.00'} USDC</p>
                  </div>
                </div>

                <p className="text-sm text-muted-foreground mb-4">
                  Shielding moves your tokens into a privacy pool where they become unlinkable to your wallet.
                  Your DCA strategies will execute from these shielded funds.
                </p>

                {!showDeposit ? (
                  <Button onClick={onShieldClick} className="w-full gap-2">
                    <ArrowDownToLine className="h-4 w-4" />
                    Shield USDC
                  </Button>
                ) : (
                  <div className="space-y-3">
                    <input
                      type="number"
                      placeholder="Amount (USDC)"
                      value={depositAmount}
                      onChange={(e) => setDepositAmount(e.target.value)}
                      className="w-full px-4 py-3 bg-background border border-border rounded-lg text-mono"
                      autoFocus
                    />
                    <Button onClick={onDeposit} disabled={isDepositing || !depositAmount} className="w-full">
                      {isDepositing ? 'Shielding...' : 'Confirm Shield'}
                    </Button>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {step === 'create_strategy' && (
          <div>
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 rounded-lg bg-accent/10">
                <Zap className="h-5 w-5 text-accent" />
              </div>
              <div>
                <h2 className="font-medium">Create Your First Strategy</h2>
                <p className="text-sm text-muted-foreground">Set up automatic private accumulation</p>
              </div>
            </div>

            <p className="text-sm text-muted-foreground mb-4">
              Choose what to accumulate, how much per trade, and how often.
              Trades execute automatically from your shielded balance.
            </p>

            <Button onClick={onCreateStrategy} className="w-full gap-2">
              <Plus className="h-4 w-4" />
              Create Strategy
            </Button>
          </div>
        )}
      </div>

      {/* How it works - brief explanation */}
      <div className="mt-8 pt-8 border-t border-border">
        <p className="text-sm text-muted-foreground text-center mb-4">How Cloak Works</p>
        <div className="flex items-center justify-center gap-4 text-xs text-muted-foreground">
          <div className="text-center">
            <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center mx-auto mb-1">
              <ArrowDownToLine className="h-4 w-4" />
            </div>
            <span>Shield</span>
          </div>
          <ArrowRight className="h-4 w-4" />
          <div className="text-center">
            <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center mx-auto mb-1">
              <Zap className="h-4 w-4" />
            </div>
            <span>Auto-Swap</span>
          </div>
          <ArrowRight className="h-4 w-4" />
          <div className="text-center">
            <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center mx-auto mb-1">
              <Check className="h-4 w-4" />
            </div>
            <span>Re-Shield</span>
          </div>
        </div>
      </div>
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
}: {
  config: DCAConfig;
  isExpanded: boolean;
  onToggle: () => void;
  onPause: (id: string) => Promise<void>;
  onResume: (id: string) => Promise<void>;
  onCancel: (id: string) => Promise<void>;
}) {
  const inputToken = getTokenInfo(config.input_token);
  const outputToken = getTokenInfo(config.output_token);
  const progress = (config.completed_trades / config.total_trades) * 100;
  const isActive = config.status === 'active';
  const isPaused = config.status === 'paused';

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
