'use client';

import { useState, useEffect, useRef } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { useDCAConfigs } from '@/hooks/useDCAConfigs';
import { useAppStore } from '@/store';
import { Button } from '@/components/ui/button';
import { CreateDCAModal } from '@/components/dca/CreateDCAModal';
import {
  Plus,
  ArrowDownToLine,
  ArrowLeftRight,
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
  Settings,
  Loader2,
} from 'lucide-react';
import { formatDistanceToNow, format } from 'date-fns';
import { TOKENS, USDC_MINT, GRAIL_USDC_MINT, GOLD_MINT } from '@/lib/solana/constants';
import { getExplorerUrl, getDevnetConnection } from '@/lib/solana/connection';
import type { DCAConfig, Execution, WalletTransaction } from '@/types';
import { LAMPORTS_PER_SOL, PublicKey, Transaction } from '@solana/web3.js';
import { SessionWallet } from './SessionWallet';
import { getAssociatedTokenAddress, createTransferInstruction, createAssociatedTokenAccountInstruction, getAccount, TokenAccountNotFoundError } from '@solana/spl-token';
import { initializePrivacyClient, resetPrivacyClient, privacyClient } from '@/lib/privacy';

function getTokenInfo(mint: string) {
  const token = Object.values(TOKENS).find((t) => t.mint === mint);
  return token || { symbol: mint.slice(0, 4), name: 'Unknown', decimals: 9, mint, logoURI: undefined };
}

// Calculate which DCAs will be funded based on available balance
function calculateDCAFundingStatus(
  activeConfigs: DCAConfig[],
  totalBalance: number
): Map<string, { funded: boolean; position: number; shortfall: number }> {
  const result = new Map<string, { funded: boolean; position: number; shortfall: number }>();
  if (activeConfigs.length === 0) return result;

  const sortedConfigs = [...activeConfigs]
    .filter(c => c.status === 'active' || c.status === 'executing')
    .sort((a, b) => new Date(a.next_execution).getTime() - new Date(b.next_execution).getTime());

  let remainingBalance = totalBalance;
  sortedConfigs.forEach((config, index) => {
    const requiredAmount = config.amount_per_trade;
    const funded = remainingBalance >= requiredAmount;
    const shortfall = funded ? 0 : requiredAmount - remainingBalance;
    result.set(config.id, { funded, position: index + 1, shortfall });
    if (funded) remainingBalance -= requiredAmount;
  });

  return result;
}


export function Dashboard() {
  const { publicKey, sendTransaction, signTransaction, signAllTransactions, signMessage, connected } = useWallet();
  const { isLoading: configsLoading, getActiveConfigs, getPausedConfigs, pauseDCA, resumeDCA, cancelDCA } = useDCAConfigs();
  const { setCreateModalOpen } = useAppStore();

  const [expandedStrategy, setExpandedStrategy] = useState<string | null>(null);
  const [showDeposit, setShowDeposit] = useState(false);
  const [depositAmount, setDepositAmount] = useState('');
  const [isDepositing, setIsDepositing] = useState(false);
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
  const [depositError, setDepositError] = useState<string | null>(null);

  // Gold balance state
  const [goldBalance, setGoldBalance] = useState<{ goldAmount: number; usdValue: number; goldPricePerOunce: number } | null>(null);

  // GRAIL USDC balance state
  const [sessionGrailUsdcBalance, setSessionGrailUsdcBalance] = useState<number | null>(null);
  const [isFauceting, setIsFauceting] = useState(false);
  const [faucetResult, setFaucetResult] = useState<string | null>(null);

  // Track mounted state
  const isMounted = useRef(true);
  const hasInitializedPrivacy = useRef(false);
  useEffect(() => {
    isMounted.current = true;
    return () => { isMounted.current = false; };
  }, []);

  // Initialize privacy client for session key derivation (we still need the session keypair logic)
  useEffect(() => {
    if (connected && publicKey && signTransaction && signAllTransactions && signMessage && !hasInitializedPrivacy.current) {
      try {
        initializePrivacyClient({
          connection: getDevnetConnection(),
          wallet: { publicKey, signTransaction, signAllTransactions, signMessage },
        });
        hasInitializedPrivacy.current = true;
      } catch (e) {
        console.error('Failed to init privacy client for session key:', e);
      }
    }
    if (!connected && hasInitializedPrivacy.current) {
      hasInitializedPrivacy.current = false;
      resetPrivacyClient();
    }
  }, [connected, publicKey, signTransaction, signAllTransactions, signMessage]);

  const activeConfigs = getActiveConfigs();
  const pausedConfigs = getPausedConfigs();
  const allStrategies = [...activeConfigs, ...pausedConfigs];
  const hasStrategies = allStrategies.length > 0;

  const sessionFunded = sessionBalance !== null && sessionBalance >= 0.005;
  const availableUsdcBalance = sessionUsdcBalance || 0;
  const availableGrailUsdcBalance = sessionGrailUsdcBalance || 0;

  // Split active configs by type for funding calculations
  const activeNonGoldConfigs = activeConfigs.filter(c =>
    (c.status === 'active' || c.status === 'executing') && c.output_token !== GOLD_MINT
  );
  const activeGoldConfigs = activeConfigs.filter(c =>
    (c.status === 'active' || c.status === 'executing') && c.output_token === GOLD_MINT
  );

  // Calculate DCA funding: Circle USDC for non-GOLD, GRAIL USDC for GOLD
  const dcaFundingStatus = calculateDCAFundingStatus(activeNonGoldConfigs, availableUsdcBalance);
  const goldDcaFundingStatus = calculateDCAFundingStatus(activeGoldConfigs, availableGrailUsdcBalance);
  // Merge both maps
  for (const [k, v] of goldDcaFundingStatus) dcaFundingStatus.set(k, v);

  const totalUsdcRequirement = activeNonGoldConfigs.reduce((sum, c) => sum + c.amount_per_trade, 0);
  const totalGrailUsdcRequirement = activeGoldConfigs.reduce((sum, c) => sum + c.amount_per_trade, 0);
  const hasUnderfundedDCAs = (availableUsdcBalance < totalUsdcRequirement && activeNonGoldConfigs.length > 0)
    || (availableGrailUsdcBalance < totalGrailUsdcRequirement && activeGoldConfigs.length > 0);
  const totalDCARequirement = totalUsdcRequirement + totalGrailUsdcRequirement;
  const fundingShortfall = Math.max(0, totalUsdcRequirement - availableUsdcBalance)
    + Math.max(0, totalGrailUsdcRequirement - availableGrailUsdcBalance);

  // Fetch session key and balances from devnet
  useEffect(() => {
    if (!hasInitializedPrivacy.current || sessionKey) return;

    privacyClient.getSessionPublicKey().then(async (key) => {
      if (!isMounted.current) return;
      setSessionKey(key);
      try {
        const connection = getDevnetConnection();
        const balance = await connection.getBalance(new PublicKey(key));
        if (!isMounted.current) return;
        setSessionBalance(balance / LAMPORTS_PER_SOL);

        // Check USDC balance (Circle devnet)
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

        // Check GRAIL USDC balance
        try {
          const grailUsdcMint = new PublicKey(GRAIL_USDC_MINT);
          const grailAta = await getAssociatedTokenAddress(grailUsdcMint, new PublicKey(key));
          const grailAccountInfo = await connection.getAccountInfo(grailAta);
          if (grailAccountInfo && isMounted.current) {
            const grailData = grailAccountInfo.data;
            const grailBalance = grailData.readBigUInt64LE(64);
            setSessionGrailUsdcBalance(Number(grailBalance) / 1e6);
          } else if (isMounted.current) {
            setSessionGrailUsdcBalance(0);
          }
        } catch {
          if (isMounted.current) setSessionGrailUsdcBalance(0);
        }
      } catch (e) {
        console.error('Failed to fetch session balance:', e);
        if (isMounted.current) {
          setSessionBalance(0);
          setSessionUsdcBalance(0);
          setSessionGrailUsdcBalance(0);
        }
      }
    }).catch(console.error);
  }, [connected, hasInitializedPrivacy.current, sessionKey]);

  // Refresh session balance periodically
  useEffect(() => {
    if (!sessionKey) return;
    const interval = setInterval(async () => {
      if (!isMounted.current) return;
      try {
        const connection = getDevnetConnection();
        const balance = await connection.getBalance(new PublicKey(sessionKey));
        if (!isMounted.current) return;
        setSessionBalance(balance / LAMPORTS_PER_SOL);

        const usdcMint = new PublicKey(USDC_MINT);
        const ata = await getAssociatedTokenAddress(usdcMint, new PublicKey(sessionKey));
        const accountInfo = await connection.getAccountInfo(ata);
        if (accountInfo && isMounted.current) {
          const data = accountInfo.data;
          const usdcBalance = data.readBigUInt64LE(64);
          setSessionUsdcBalance(Number(usdcBalance) / 1e6);
        }

        // Refresh GRAIL USDC balance
        try {
          const grailUsdcMint = new PublicKey(GRAIL_USDC_MINT);
          const grailAta = await getAssociatedTokenAddress(grailUsdcMint, new PublicKey(sessionKey));
          const grailAccountInfo = await connection.getAccountInfo(grailAta);
          if (grailAccountInfo && isMounted.current) {
            const grailData = grailAccountInfo.data;
            const grailBalance = grailData.readBigUInt64LE(64);
            setSessionGrailUsdcBalance(Number(grailBalance) / 1e6);
          }
        } catch { /* ignore */ }
      } catch (e) {
        console.error('Failed to refresh session balance:', e);
      }
    }, 10000);
    return () => clearInterval(interval);
  }, [sessionKey]);

  // Fetch recent activity
  useEffect(() => {
    if (publicKey) fetchRecentActivity();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [publicKey, hasStrategies]);

  // Fetch gold balance
  useEffect(() => {
    if (!publicKey) return;
    const fetchGold = async () => {
      try {
        const res = await fetch('/api/grail/balance', {
          headers: { 'x-wallet-address': publicKey.toBase58() },
        });
        if (res.ok && isMounted.current) {
          setGoldBalance(await res.json());
        }
      } catch (e) {
        console.error('Failed to fetch gold balance:', e);
      }
    };
    fetchGold();
    const interval = setInterval(fetchGold, 30000);
    return () => clearInterval(interval);
  }, [publicKey]);

  const fetchRecentActivity = async () => {
    if (!publicKey || !isMounted.current) return;
    const walletAddress = publicKey.toBase58();

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

  // Devnet deposit: transfer USDC from main wallet → session wallet (no privacy shielding)
  const handleDeposit = async () => {
    if (!depositAmount || isNaN(Number(depositAmount)) || !publicKey || !sessionKey) return;

    setIsDepositing(true);
    setDepositSuccess(false);
    setDepositError(null);

    try {
      const connection = getDevnetConnection();
      const usdcMint = new PublicKey(USDC_MINT);
      const sessionPublicKey = new PublicKey(sessionKey);
      const amount = Number(depositAmount);
      const amountInBaseUnits = Math.floor(amount * 1e6);

      const sourceAta = await getAssociatedTokenAddress(usdcMint, publicKey);
      const destAta = await getAssociatedTokenAddress(usdcMint, sessionPublicKey);

      const transaction = new Transaction();

      // Create destination ATA if needed
      try {
        await getAccount(connection, destAta);
      } catch (error) {
        if (error instanceof TokenAccountNotFoundError) {
          transaction.add(
            createAssociatedTokenAccountInstruction(publicKey, destAta, sessionPublicKey, usdcMint)
          );
        } else {
          throw error;
        }
      }

      transaction.add(
        createTransferInstruction(sourceAta, destAta, publicKey, amountInBaseUnits)
      );

      const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash();
      transaction.recentBlockhash = blockhash;
      transaction.feePayer = publicKey;

      const transferSig = await sendTransaction(transaction, connection);
      console.log(`USDC transfer: ${transferSig}`);

      const confirmation = await connection.confirmTransaction({
        signature: transferSig, blockhash, lastValidBlockHeight,
      }, 'confirmed');

      if (confirmation.value.err) {
        throw new Error(`Transfer failed: ${JSON.stringify(confirmation.value.err)}`);
      }

      // Verify balance arrived
      await new Promise(resolve => setTimeout(resolve, 2000));
      let verified = false;
      for (let i = 0; i < 5; i++) {
        try {
          const accountInfo = await connection.getAccountInfo(destAta);
          if (accountInfo) {
            const newBalance = Number(accountInfo.data.readBigUInt64LE(64)) / 1e6;
            if (newBalance >= amount * 0.99) {
              setSessionUsdcBalance(newBalance);
              verified = true;
              break;
            }
          }
        } catch { /* retry */ }
        await new Promise(resolve => setTimeout(resolve, 2000));
      }

      if (!verified) {
        throw new Error('Transfer sent but balance not yet confirmed. Check your session wallet.');
      }

      if (!isMounted.current) return;
      setDepositAmount('');
      setShowDeposit(false);
      setDepositSuccess(true);
      setDepositTx(transferSig);
      fetchRecentActivity();
    } catch (error) {
      console.error('Deposit failed:', error);
      if (isMounted.current) setDepositError(error instanceof Error ? error.message : 'Deposit failed');
    } finally {
      if (isMounted.current) setIsDepositing(false);
    }
  };

  // Request GRAIL USDC via faucet (triggers user creation + auto-airdrop)
  const handleFaucet = async () => {
    if (!publicKey || !sessionKey) return;
    setIsFauceting(true);
    setFaucetResult(null);
    try {
      const res = await fetch('/api/grail/faucet', {
        method: 'POST',
        headers: {
          'x-wallet-address': publicKey.toBase58(),
          'x-session-wallet': sessionKey,
        },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Faucet failed');
      setFaucetResult(data.alreadyCreated
        ? 'GRAIL user already exists — USDC was minted on creation'
        : '1,000,000 gUSDC minted to session wallet!');
      // Refresh balances after a short delay to let the chain settle
      setTimeout(refreshBalances, 3000);
    } catch (error) {
      setFaucetResult(error instanceof Error ? error.message : 'Faucet failed');
    } finally {
      setIsFauceting(false);
    }
  };

  const copySessionKey = () => {
    if (sessionKey) {
      navigator.clipboard.writeText(sessionKey);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const refreshBalances = async () => {
    if (!sessionKey) return;
    try {
      const connection = getDevnetConnection();
      const sessionPubkey = new PublicKey(sessionKey);
      const balance = await connection.getBalance(sessionPubkey);
      setSessionBalance(balance / LAMPORTS_PER_SOL);

      // Circle USDC
      const usdcMint = new PublicKey(USDC_MINT);
      const ata = await getAssociatedTokenAddress(usdcMint, sessionPubkey);
      const accountInfo = await connection.getAccountInfo(ata);
      if (accountInfo) {
        setSessionUsdcBalance(Number(accountInfo.data.readBigUInt64LE(64)) / 1e6);
      }

      // GRAIL USDC
      try {
        const grailUsdcMint = new PublicKey(GRAIL_USDC_MINT);
        const grailAta = await getAssociatedTokenAddress(grailUsdcMint, sessionPubkey);
        const grailAccountInfo = await connection.getAccountInfo(grailAta);
        if (grailAccountInfo) {
          setSessionGrailUsdcBalance(Number(grailAccountInfo.data.readBigUInt64LE(64)) / 1e6);
        }
      } catch { /* ignore */ }
    } catch (e) {
      console.error('Failed to refresh:', e);
    }
  };

  // Loading state — just wait for session balance
  if (sessionBalance === null) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="relative">
          <div className="h-10 w-10 rounded-full border-2 border-muted" />
          <div className="absolute inset-0 h-10 w-10 rounded-full border-2 border-transparent border-t-accent animate-spin" />
        </div>
      </div>
    );
  }

  // Onboarding for new users: fund session wallet + deposit USDC
  const needsOnboarding = availableUsdcBalance === 0 && !hasStrategies;
  const needsGas = !sessionFunded;

  if (needsOnboarding) {
    return (
      <div className="min-h-screen pt-24 pb-20">
        <div className="max-w-xl mx-auto px-6">
          <div className="text-center mb-10">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-accent/10 border border-accent/20 mb-6">
              <Wallet className="h-4 w-4 text-accent" />
              <span className="text-sm text-accent">Gold DCA</span>
            </div>
            <h1 className="text-3xl font-light mb-3">Start Accumulating</h1>
            <p className="text-muted-foreground">
              Fund your session wallet with USDC to begin automated dollar-cost averaging into gold and SOL.
            </p>
          </div>

          <div className="rounded-xl bg-card border border-border overflow-hidden">
            {/* Step 1: Gas if needed */}
            {needsGas ? (
              <div className="p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 rounded-lg bg-accent/10">
                    <Wallet className="h-5 w-5 text-accent" />
                  </div>
                  <div>
                    <h2 className="font-medium">Fund Gas</h2>
                    <p className="text-sm text-muted-foreground">Send ~0.01 SOL to your session wallet for tx fees</p>
                  </div>
                </div>

                <div className="p-4 rounded-lg bg-muted/50 mb-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs text-muted-foreground">Session wallet address</span>
                    <button onClick={copySessionKey} className="text-xs text-accent hover:text-accent/80 flex items-center gap-1">
                      {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                      {copied ? 'Copied!' : 'Copy'}
                    </button>
                  </div>
                  <code className="text-xs text-mono break-all">{sessionKey || 'Loading...'}</code>
                </div>

                <div className="flex items-center justify-between p-4 rounded-lg border border-border mb-4">
                  <div>
                    <p className="text-xs text-muted-foreground">SOL Balance</p>
                    <p className="text-lg font-medium text-mono">{sessionBalance?.toFixed(4) || '0'} SOL</p>
                  </div>
                  <Button variant="ghost" size="sm" onClick={refreshBalances}>
                    <RefreshCw className="h-4 w-4" />
                  </Button>
                </div>

                <p className="text-xs text-muted-foreground text-center">
                  On devnet, use <code className="text-accent">solana airdrop 1 {sessionKey?.slice(0, 8)}... --url devnet</code>
                </p>
              </div>
            ) : (
              /* Step 2: Deposit USDC */
              <div className="p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 rounded-lg bg-accent/10">
                    <ArrowDownToLine className="h-5 w-5 text-accent" />
                  </div>
                  <div>
                    <h2 className="font-medium">Deposit USDC</h2>
                    <p className="text-sm text-muted-foreground">Transfer USDC from your wallet to the session wallet</p>
                  </div>
                </div>

                {depositError && (
                  <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 mb-4 flex items-start gap-2">
                    <AlertCircle className="h-4 w-4 text-destructive mt-0.5 shrink-0" />
                    <p className="text-sm text-destructive">{depositError}</p>
                  </div>
                )}

                {depositSuccess ? (
                  <div className="text-center py-4">
                    <div className="w-12 h-12 rounded-full bg-green-500/20 flex items-center justify-center mx-auto mb-4">
                      <Check className="h-6 w-6 text-green-500" />
                    </div>
                    <h2 className="font-medium mb-2">USDC Deposited!</h2>
                    <p className="text-sm text-muted-foreground mb-4">
                      Session wallet funded. Create a DCA strategy to start.
                    </p>
                    {depositTx && (
                      <a
                        href={getExplorerUrl(depositTx)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 text-sm text-accent hover:underline mb-4"
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
                ) : (
                  <div className="space-y-4">
                    <input
                      type="number"
                      placeholder="Amount (USDC)"
                      value={depositAmount}
                      onChange={(e) => setDepositAmount(e.target.value)}
                      className="w-full px-4 py-3 bg-background border border-border rounded-lg text-mono text-lg"
                      autoFocus
                    />

                    <div className="flex gap-2">
                      {[5, 10, 20, 50].map((amount) => (
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
                      {isDepositing ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Transferring...
                        </>
                      ) : (
                        'Deposit USDC'
                      )}
                    </Button>

                    <p className="text-xs text-muted-foreground text-center">
                      USDC is transferred from your main wallet to the session wallet for DCA execution.
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="mt-10 text-center">
            <p className="text-sm text-muted-foreground mb-4">How it works</p>
            <div className="flex items-center justify-center gap-6 text-xs text-muted-foreground">
              <div className="text-center">
                <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center mx-auto mb-2">1</div>
                <span>Fund</span>
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

  // ─── Main Dashboard ───
  return (
    <div className="min-h-screen pt-24 pb-20">
      <div className="max-w-2xl mx-auto px-6">

        {/* Balance Section */}
        <section className="mb-14">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <p className="text-sm text-muted-foreground">Session Balance</p>
              <div className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-accent/10 text-[10px] text-accent font-medium">
                DEVNET
              </div>
            </div>
            <button
              onClick={refreshBalances}
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              <RefreshCw className="h-4 w-4" />
            </button>
          </div>

          <p className="text-5xl font-light tracking-tight mb-6">
            <span className="text-muted-foreground">$</span>
            {availableUsdcBalance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>

          {/* Asset pills */}
          <div className="flex flex-wrap gap-3 mb-6">
            {availableUsdcBalance > 0 && (
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-card border border-border text-sm">
                <img src="https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v/logo.png" alt="" className="h-4 w-4 rounded-full" />
                <span className="font-medium">{availableUsdcBalance.toFixed(2)}</span>
                <span className="text-muted-foreground">USDC</span>
              </div>
            )}
            {availableGrailUsdcBalance > 0 && (
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-card border border-amber-500/30 text-sm">
                <img src="https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v/logo.png" alt="" className="h-4 w-4 rounded-full" />
                <span className="font-medium">{availableGrailUsdcBalance.toLocaleString('en-US', { maximumFractionDigits: 2 })}</span>
                <span className="text-amber-400">gUSDC</span>
              </div>
            )}
            {sessionBalance !== null && sessionBalance > 0 && (
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-card border border-border text-sm">
                <img src="https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/So11111111111111111111111111111111111111112/logo.png" alt="" className="h-4 w-4 rounded-full" />
                <span className="font-medium">{sessionBalance.toFixed(4)}</span>
                <span className="text-muted-foreground">SOL</span>
              </div>
            )}
          </div>

          {/* Get Devnet GRAIL USDC (faucet) */}
          {sessionGrailUsdcBalance !== null && sessionGrailUsdcBalance === 0 && (
            <div className="mb-6">
              <button
                onClick={handleFaucet}
                disabled={isFauceting}
                className="flex items-center gap-2 px-3 py-2 rounded-lg bg-amber-500/10 border border-amber-500/20 text-sm text-amber-400 hover:bg-amber-500/20 transition-colors disabled:opacity-50"
              >
                {isFauceting ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <ArrowDownToLine className="h-3.5 w-3.5" />
                )}
                {isFauceting ? 'Requesting gUSDC...' : 'Get Devnet gUSDC (for Gold DCA)'}
              </button>
              {faucetResult && (
                <p className="text-xs text-muted-foreground mt-2">{faucetResult}</p>
              )}
            </div>
          )}

          {/* Deposit */}
          <button
            onClick={() => setShowDeposit(!showDeposit)}
            className={`pb-3 text-sm font-medium transition-all relative mb-5 ${
              showDeposit ? 'text-zinc-100' : 'text-zinc-500 hover:text-zinc-300'
            }`}
          >
            Deposit
            {showDeposit && <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-zinc-100 rounded-full" />}
          </button>

          {showDeposit && (
            <div>
              {depositError && (
                <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 mb-3 flex items-start gap-2">
                  <AlertCircle className="h-4 w-4 text-destructive mt-0.5 shrink-0" />
                  <p className="text-sm text-destructive">{depositError}</p>
                </div>
              )}
              <div className="flex items-center gap-2 p-1.5 rounded-xl bg-muted/30 border border-border">
                <div className="flex items-center gap-2 pl-3 pr-2 py-2 text-muted-foreground">
                  <img src="https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v/logo.png" alt="" className="h-5 w-5 rounded-full" />
                  <span className="text-sm font-medium text-foreground">USDC</span>
                </div>
                <input
                  type="number"
                  placeholder="0.00"
                  value={depositAmount}
                  onChange={(e) => setDepositAmount(e.target.value)}
                  className="flex-1 bg-transparent text-lg font-medium text-mono placeholder:text-muted-foreground/50 focus:outline-none text-right pr-2"
                  autoFocus
                />
                <Button
                  onClick={handleDeposit}
                  disabled={isDepositing || !depositAmount || Number(depositAmount) <= 0}
                  size="sm"
                  className="h-10 px-5 rounded-lg"
                >
                  {isDepositing ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Deposit'}
                </Button>
              </div>
            </div>
          )}
        </section>

        {/* Gold Balance Section */}
        {goldBalance && goldBalance.goldAmount > 0 && (
          <section className="mb-14">
            <div className="flex items-center gap-2 mb-3">
              <p className="text-sm text-muted-foreground">Gold Holdings</p>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-400 font-medium">GRAIL</span>
            </div>
            <div className="p-5 rounded-lg bg-card border border-amber-500/20">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <p className="text-3xl font-light tracking-tight text-amber-400">
                    {goldBalance.goldAmount.toFixed(4)} <span className="text-lg text-amber-400/70">oz</span>
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">
                    ${goldBalance.usdValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-muted-foreground">Price / oz</p>
                  <p className="text-sm text-mono">${goldBalance.goldPricePerOunce.toLocaleString('en-US', { minimumFractionDigits: 2 })}</p>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* Strategies Section */}
        <section className="mb-14">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-lg font-medium">Strategies</h2>
            <Button onClick={() => setCreateModalOpen(true)} size="sm" className="gap-2">
              <Plus className="h-4 w-4" />
              New
            </Button>
          </div>

          {/* Low gas warning */}
          {!sessionFunded && hasStrategies && (
            <div className="mb-4 px-4 py-3 rounded-lg bg-red-500/5 border border-red-500/20 flex items-center justify-between">
              <div className="flex items-center gap-3 text-sm">
                <div className="w-1.5 h-1.5 rounded-full bg-red-400" />
                <span className="text-red-400/90">
                  Low gas — need <span className="font-mono">0.005 SOL</span>, have <span className="font-mono">{sessionBalance?.toFixed(4) || '0'}</span>
                </span>
              </div>
              <button onClick={copySessionKey} className="text-xs text-red-400 hover:text-red-300 transition-colors flex items-center gap-1">
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
                onClick={() => setShowDeposit(true)}
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
              <p className="text-muted-foreground">No active strategies</p>
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

        {/* Session Wallet */}
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
                        const isPending = exec.status === 'pending';
                        const statusStyles = isSuccess
                          ? 'bg-emerald-500/15 text-emerald-400'
                          : isPending ? 'bg-amber-500/15 text-amber-400' : 'bg-red-500/15 text-red-400';

                        return (
                          <div key={`trade-${exec.id}`} className="flex items-center justify-between py-3 border-b border-border last:border-0 group/item">
                            <div className="flex items-center gap-3">
                              <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${statusStyles}`}>
                                {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowLeftRight className="h-4 w-4" />}
                              </div>
                              <div>
                                <p className="text-sm">
                                  <span className="font-medium">{exec.input_amount} {inputToken.symbol}</span>
                                  <span className="text-muted-foreground mx-1.5">&rarr;</span>
                                  <span className="font-medium">{exec.output_amount?.toFixed(4) || '—'} {outputToken.symbol}</span>
                                </p>
                                <p className="text-xs text-muted-foreground">{format(activity.date, 'MMM d, h:mm a')}</p>
                              </div>
                            </div>
                            {exec.tx_signature && (
                              <a href={getExplorerUrl(exec.tx_signature)} target="_blank" rel="noopener noreferrer"
                                className="text-muted-foreground hover:text-accent transition-colors p-1.5 opacity-0 group-hover/item:opacity-100">
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
                          <div key={`tx-${tx.id}`} className="flex items-center justify-between py-3 border-b border-border last:border-0 group/item">
                            <div className="flex items-center gap-3">
                              <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${isDeposit ? 'bg-sky-500/15 text-sky-400' : 'bg-orange-500/15 text-orange-400'}`}>
                                <ArrowDownToLine className="h-4 w-4" />
                              </div>
                              <div>
                                <p className="text-sm">
                                  <span className="font-medium">{isDeposit ? 'Deposited' : 'Withdrew'}</span>
                                  <span className="text-muted-foreground mx-1.5">{tx.amount.toFixed(2)}</span>
                                  <span className="font-medium">{token.symbol}</span>
                                </p>
                                <p className="text-xs text-muted-foreground">{format(activity.date, 'MMM d, h:mm a')}</p>
                              </div>
                            </div>
                            {tx.tx_signature && (
                              <a href={getExplorerUrl(tx.tx_signature)} target="_blank" rel="noopener noreferrer"
                                className="text-muted-foreground hover:text-accent transition-colors p-1.5 opacity-0 group-hover/item:opacity-100">
                                <ExternalLink className="h-3.5 w-3.5" />
                              </a>
                            )}
                          </div>
                        );
                      }
                    })}
                  </div>
                  {totalPages > 1 && (
                    <div className="flex items-center justify-between mt-4 pt-4 border-t border-border/50">
                      <button onClick={() => setActivityPage(p => Math.max(0, p - 1))} disabled={activityPage === 0}
                        className="text-xs text-muted-foreground hover:text-foreground disabled:opacity-30 transition-colors">
                        &larr; Newer
                      </button>
                      <span className="text-xs text-muted-foreground/60 tabular-nums">{activityPage + 1} / {totalPages}</span>
                      <button onClick={() => setActivityPage(p => Math.min(totalPages - 1, p + 1))} disabled={activityPage >= totalPages - 1}
                        className="text-xs text-muted-foreground hover:text-foreground disabled:opacity-30 transition-colors">
                        Older &rarr;
                      </button>
                    </div>
                  )}
                </>
              );
            })()}
          </section>
        )}

        {/* Advanced Section */}
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
                <span className="text-muted-foreground">Session Wallet</span>
                <div className="flex items-center gap-2">
                  <span className="text-mono text-xs">{sessionKey?.slice(0, 8)}...{sessionKey?.slice(-6)}</span>
                  <button onClick={copySessionKey} className="text-muted-foreground hover:text-foreground">
                    {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                  </button>
                </div>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Gas Balance</span>
                <span className="text-mono">{sessionBalance?.toFixed(4)} SOL</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">USDC Balance</span>
                <span className="text-mono">{availableUsdcBalance.toFixed(2)} USDC</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">GRAIL USDC Balance</span>
                <span className="text-mono">{availableGrailUsdcBalance.toLocaleString('en-US', { maximumFractionDigits: 2 })} gUSDC</span>
              </div>
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
            <p className="font-medium">{inputToken.symbol} &rarr; {outputToken.symbol}</p>
            <p className="text-xs text-muted-foreground">
              {config.amount_per_trade} per trade &middot; every {config.frequency_hours}h
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
              <p className="text-xs text-muted-foreground mb-0.5">Next trade</p>
              <p className="font-medium">
                {isActive ? formatDistanceToNow(new Date(config.next_execution), { addSuffix: true }) : '—'}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-0.5">Spent</p>
              <p className="font-medium text-mono">
                {(config.completed_trades * config.amount_per_trade).toFixed(2)} {inputToken.symbol}
              </p>
            </div>
          </div>

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
