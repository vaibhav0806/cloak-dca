'use client';

import { useState, useEffect, useCallback } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { Button } from '@/components/ui/button';
import {
  ArrowUpRight,
  RefreshCw,
  Check,
  Loader2,
  ExternalLink,
  Coins,
} from 'lucide-react';
import { TOKENS } from '@/lib/solana/constants';
import { getExplorerUrl } from '@/lib/solana/connection';
import { privacyClient } from '@/lib/privacy';

interface SessionBalance {
  token: typeof TOKENS.SOL;
  amount: number;
  usdValue: number;
}

interface SessionWalletProps {
  sessionPublicKey: string | null;
}

export function SessionWallet({ sessionPublicKey }: SessionWalletProps) {
  const { publicKey } = useWallet();
  const [balances, setBalances] = useState<SessionBalance[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasFetched, setHasFetched] = useState(false);
  const [isWithdrawing, setIsWithdrawing] = useState<string | null>(null);
  const [withdrawSuccess, setWithdrawSuccess] = useState<{ token: string; tx: string } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchBalances = useCallback(async () => {
    if (!sessionPublicKey) return;

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/session/balances', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionPublicKey }),
      });

      if (response.ok) {
        const data = await response.json();
        setBalances(data.balances || []);
      } else {
        throw new Error('Failed to fetch balances');
      }
    } catch (err) {
      console.error('Error fetching session balances:', err);
      setError('Failed to load balances');
    } finally {
      setIsLoading(false);
      setHasFetched(true);
    }
  }, [sessionPublicKey]);

  useEffect(() => {
    fetchBalances();
  }, [fetchBalances]);

  // Refresh periodically
  useEffect(() => {
    if (!sessionPublicKey) return;
    const interval = setInterval(fetchBalances, 30000);
    return () => clearInterval(interval);
  }, [sessionPublicKey, fetchBalances]);

  const handleWithdraw = async (token: SessionBalance['token'], amount: number) => {
    if (!publicKey) return;

    setIsWithdrawing(token.mint);
    setError(null);
    setWithdrawSuccess(null);

    try {
      // Get session keypair from privacy client
      const sessionKeypairBase64 = await privacyClient.exportSessionKeypair();

      const response = await fetch('/api/session/withdraw', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          walletAddress: publicKey.toBase58(),
          tokenMint: token.mint,
          amount,
          sessionKeypairBase64,
        }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setWithdrawSuccess({ token: token.symbol, tx: data.signature });
        // Refresh balances after short delay
        setTimeout(fetchBalances, 2000);
      } else {
        throw new Error(data.error || 'Withdrawal failed');
      }
    } catch (err) {
      console.error('Withdrawal error:', err);
      setError(err instanceof Error ? err.message : 'Withdrawal failed');
    } finally {
      setIsWithdrawing(null);
    }
  };

  // Don't render if no session key, or if we've fetched and have no balances
  if (!sessionPublicKey || (hasFetched && balances.length === 0)) {
    return null;
  }

  // Don't show anything during initial fetch
  if (!hasFetched && isLoading) {
    return null;
  }

  return (
    <section className="mb-14">
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-lg font-medium">Ready to Withdraw</h2>
        <button
          onClick={fetchBalances}
          disabled={isLoading}
          className="text-muted-foreground hover:text-foreground transition-colors p-1"
        >
          <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Success message */}
      {withdrawSuccess && (
        <div className="mb-4 flex items-center justify-between py-3 px-4 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/15 flex items-center justify-center">
              <Check className="h-4 w-4 text-emerald-400" />
            </div>
            <span className="text-sm text-emerald-400">Withdrew {withdrawSuccess.token} to your wallet</span>
          </div>
          <a
            href={getExplorerUrl(withdrawSuccess.tx)}
            target="_blank"
            rel="noopener noreferrer"
            className="text-emerald-400 hover:text-emerald-300 transition-colors p-1"
          >
            <ExternalLink className="h-4 w-4" />
          </a>
        </div>
      )}

      {/* Error message */}
      {error && (
        <div className="mb-4 py-3 px-4 rounded-lg bg-red-500/10 border border-red-500/20 text-sm text-red-400">
          {error}
        </div>
      )}

      {/* Token list */}
      <div className="space-y-1">
        {balances.map((balance) => (
          <div
            key={balance.token.mint}
            className="flex items-center justify-between py-3 border-b border-border last:border-0 group/item"
          >
            <div className="flex items-center gap-3">
              {balance.token.logoURI ? (
                <img
                  src={balance.token.logoURI}
                  alt=""
                  className="h-8 w-8 rounded-lg"
                />
              ) : (
                <div className="h-8 w-8 rounded-lg bg-muted flex items-center justify-center">
                  <Coins className="h-4 w-4 text-muted-foreground" />
                </div>
              )}
              <div>
                <p className="text-sm font-medium">{balance.token.symbol}</p>
                <p className="text-xs text-muted-foreground">{balance.token.name}</p>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <p className="text-sm text-mono tabular-nums">
                {balance.amount.toLocaleString('en-US', {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: balance.token.decimals > 6 ? 6 : 4,
                })}
              </p>

              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleWithdraw(balance.token, balance.amount)}
                disabled={isWithdrawing === balance.token.mint}
                className="gap-1.5 h-8 px-3 text-muted-foreground hover:text-foreground"
              >
                {isWithdrawing === balance.token.mint ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    <span className="text-xs">Sending...</span>
                  </>
                ) : (
                  <>
                    <ArrowUpRight className="h-3.5 w-3.5" />
                    <span className="text-xs">Withdraw</span>
                  </>
                )}
              </Button>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
