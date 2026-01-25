'use client';

import { useState, useEffect, useCallback } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { Button } from '@/components/ui/button';
import {
  Wallet,
  ArrowUpRight,
  RefreshCw,
  Check,
  Loader2,
  ExternalLink,
} from 'lucide-react';
import { TOKENS } from '@/lib/solana/constants';
import { getExplorerUrl } from '@/lib/solana/connection';

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
      const response = await fetch('/api/session/withdraw', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          walletAddress: publicKey.toBase58(),
          tokenMint: token.mint,
          amount,
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

  // Don't render if no balances
  if (!sessionPublicKey || (balances.length === 0 && !isLoading)) {
    return null;
  }

  return (
    <section className="mb-14">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-medium">DCA Tokens</h2>
          <div className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-muted">
            <Wallet className="h-3 w-3 text-muted-foreground" />
          </div>
        </div>
        <button
          onClick={fetchBalances}
          disabled={isLoading}
          className="text-muted-foreground hover:text-foreground transition-colors"
        >
          <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      <p className="text-sm text-muted-foreground mb-4">
        Tokens from your DCA trades, ready to withdraw to your wallet.
      </p>

      {/* Success message */}
      {withdrawSuccess && (
        <div className="mb-4 p-3 rounded-lg bg-green-500/10 border border-green-500/20 flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm text-green-400">
            <Check className="h-4 w-4" />
            <span>Withdrew {withdrawSuccess.token} to your wallet</span>
          </div>
          <a
            href={getExplorerUrl(withdrawSuccess.tx)}
            target="_blank"
            rel="noopener noreferrer"
            className="text-green-400 hover:text-green-300 transition-colors"
          >
            <ExternalLink className="h-4 w-4" />
          </a>
        </div>
      )}

      {/* Error message */}
      {error && (
        <div className="mb-4 p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-sm text-destructive">
          {error}
        </div>
      )}

      {/* Loading state */}
      {isLoading && balances.length === 0 ? (
        <div className="p-6 rounded-lg bg-card border border-border">
          <div className="flex items-center justify-center gap-2 text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span className="text-sm">Loading balances...</span>
          </div>
        </div>
      ) : (
        <div className="space-y-2">
          {balances.map((balance) => (
            <div
              key={balance.token.mint}
              className="p-4 rounded-lg bg-card border border-border flex items-center justify-between group hover:border-border/80 transition-colors"
            >
              <div className="flex items-center gap-3">
                {balance.token.logoURI ? (
                  <img
                    src={balance.token.logoURI}
                    alt=""
                    className="h-9 w-9 rounded-full"
                  />
                ) : (
                  <div className="h-9 w-9 rounded-full bg-muted flex items-center justify-center text-xs font-medium">
                    {balance.token.symbol.slice(0, 2)}
                  </div>
                )}
                <div>
                  <p className="font-medium">{balance.token.symbol}</p>
                  <p className="text-sm text-muted-foreground">{balance.token.name}</p>
                </div>
              </div>

              <div className="flex items-center gap-4">
                <div className="text-right">
                  <p className="text-mono font-medium">
                    {balance.amount.toLocaleString('en-US', {
                      minimumFractionDigits: balance.token.decimals > 6 ? 6 : 2,
                      maximumFractionDigits: balance.token.decimals > 6 ? 6 : 4,
                    })}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {balance.token.symbol}
                  </p>
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleWithdraw(balance.token, balance.amount)}
                  disabled={isWithdrawing === balance.token.mint}
                  className="gap-1.5 min-w-[100px]"
                >
                  {isWithdrawing === balance.token.mint ? (
                    <>
                      <Loader2 className="h-3 w-3 animate-spin" />
                      Sending...
                    </>
                  ) : (
                    <>
                      <ArrowUpRight className="h-3 w-3" />
                      Withdraw
                    </>
                  )}
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
