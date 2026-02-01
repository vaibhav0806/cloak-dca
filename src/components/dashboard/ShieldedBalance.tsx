'use client';

import { useState, useEffect } from 'react';
import { useShieldedBalance } from '@/hooks/useShieldedBalance';
import { Button } from '@/components/ui/button';
import { RefreshCw, ArrowDown, ArrowUp, Copy, Check } from 'lucide-react';
import { useWallet } from '@solana/wallet-adapter-react';
import { SUPPORTED_INPUT_TOKENS } from '@/lib/solana/constants';
import { analytics } from '@/lib/analytics';

export function ShieldedBalance() {
  const { connected, publicKey } = useWallet();
  const { balances, isLoading, fetchBalances, deposit, withdraw, getSessionPublicKey, isInitialized } = useShieldedBalance();
  const [isDepositing, setIsDepositing] = useState(false);
  const [isWithdrawing, setIsWithdrawing] = useState(false);
  const [depositAmount, setDepositAmount] = useState('');
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [withdrawToken, setWithdrawToken] = useState('');
  const [sessionWalletAddress, setSessionWalletAddress] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [showWithdraw, setShowWithdraw] = useState(false);

  useEffect(() => {
    if (isInitialized && !sessionWalletAddress) {
      getSessionPublicKey().then(setSessionWalletAddress).catch(console.error);
    }
  }, [isInitialized]);

  const copyAddress = () => {
    if (sessionWalletAddress) {
      navigator.clipboard.writeText(sessionWalletAddress);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleDeposit = async () => {
    if (!depositAmount || isNaN(Number(depositAmount))) return;
    setIsDepositing(true);
    const amount = Number(depositAmount);
    analytics.depositStarted(amount);
    try {
      const usdcToken = SUPPORTED_INPUT_TOKENS[0];
      const result = await deposit(usdcToken.mint, amount);
      analytics.depositCompleted(amount);
      setDepositAmount('');
      alert(`Deposited ${depositAmount} USDC. Tx: ${result.signature}`);
    } catch (error) {
      alert(`Deposit failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsDepositing(false);
    }
  };

  const handleWithdraw = async () => {
    if (!withdrawAmount || isNaN(Number(withdrawAmount)) || !withdrawToken || !publicKey) return;
    setIsWithdrawing(true);
    const amount = Number(withdrawAmount);
    const tokenInfo = balances.find(b => b.token.mint === withdrawToken);
    analytics.withdrawStarted(tokenInfo?.token.symbol || 'unknown', amount);
    try {
      const result = await withdraw(withdrawToken, amount, publicKey.toBase58());
      analytics.withdrawCompleted(tokenInfo?.token.symbol || 'unknown', amount);
      setWithdrawAmount('');
      setWithdrawToken('');
      setShowWithdraw(false);
      alert(`Withdrawn to wallet. Tx: ${result.signature}`);
      fetchBalances(true);
    } catch (error) {
      alert(`Withdraw failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsWithdrawing(false);
    }
  };

  if (!connected) {
    return (
      <div className="card p-6">
        <p className="text-label accent mb-2">Shielded Balance</p>
        <p className="text-muted-foreground text-sm">Connect wallet to view</p>
      </div>
    );
  }

  const totalUsdValue = balances.reduce((acc, b) => acc + (b.usdValue || 0), 0);

  return (
    <div className="card">
      {/* Header */}
      <div className="p-6 border-b border-border">
        <div className="flex items-center justify-between mb-4">
          <p className="text-label accent">Shielded Balance</p>
          <button
            onClick={() => fetchBalances(true)}
            disabled={isLoading}
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
        <p className="text-value">
          ${totalUsdValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </p>
      </div>

      {/* Balances */}
      <div className="p-6 space-y-4">
        {balances.length === 0 ? (
          <p className="text-muted-foreground text-sm">No shielded assets</p>
        ) : (
          balances.map((balance) => (
            <div key={balance.token.mint} className="flex items-center justify-between group">
              <div className="flex items-center gap-3">
                {balance.token.logoURI ? (
                  <img src={balance.token.logoURI} alt={balance.token.symbol} className="h-8 w-8 rounded-full" />
                ) : (
                  <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center text-xs font-medium">
                    {balance.token.symbol.slice(0, 2)}
                  </div>
                )}
                <div>
                  <p className="text-title">{balance.token.symbol}</p>
                  <p className="text-xs text-muted-foreground">{balance.token.name}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="text-right">
                  <p className="text-mono">{balance.amount.toLocaleString('en-US', { maximumFractionDigits: 6 })}</p>
                  {balance.usdValue !== undefined && (
                    <p className="text-xs text-muted-foreground">${balance.usdValue.toFixed(2)}</p>
                  )}
                </div>
                {balance.amount > 0 && (
                  <button
                    onClick={() => {
                      setWithdrawToken(balance.token.mint);
                      setWithdrawAmount(balance.amount.toString());
                      setShowWithdraw(true);
                    }}
                    className="text-muted-foreground hover:text-accent p-1 opacity-0 group-hover:opacity-100 transition-all"
                  >
                    <ArrowUp className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Withdraw Panel */}
      {showWithdraw && (
        <div className="px-6 pb-6">
          <div className="p-4 bg-muted rounded-md border border-border">
            <p className="text-title mb-3">Withdraw to wallet</p>
            <div className="flex gap-2">
              <input
                type="number"
                placeholder="Amount"
                value={withdrawAmount}
                onChange={(e) => setWithdrawAmount(e.target.value)}
                className="flex-1 px-3 py-2 bg-background border border-border rounded-md text-sm text-mono"
              />
              <Button onClick={handleWithdraw} disabled={isWithdrawing || !withdrawAmount} size="sm">
                {isWithdrawing ? 'Sending...' : 'Withdraw'}
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setShowWithdraw(false)}>
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Session Wallet */}
      {sessionWalletAddress && (
        <div className="px-6 pb-6">
          <div className="p-4 border border-dashed border-border rounded-md">
            <p className="text-label mb-1">Session Key</p>
            <p className="text-xs text-muted-foreground mb-3">Fund with USDC + SOL for execution</p>
            <div className="flex items-center gap-2">
              <code className="flex-1 text-xs bg-muted px-3 py-2 rounded-md text-mono truncate border border-border">
                {sessionWalletAddress}
              </code>
              <button onClick={copyAddress} className="text-muted-foreground hover:text-accent p-2 transition-colors">
                {copied ? <Check className="h-4 w-4 accent" /> : <Copy className="h-4 w-4" />}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Deposit */}
      <div className="p-6 border-t border-border bg-secondary/50">
        <div className="flex gap-2">
          <input
            type="number"
            placeholder="Amount (USDC)"
            value={depositAmount}
            onChange={(e) => setDepositAmount(e.target.value)}
            className="flex-1 px-3 py-2 bg-background border border-border rounded-md text-sm text-mono"
          />
          <Button onClick={handleDeposit} disabled={isDepositing || !depositAmount}>
            <ArrowDown className="h-4 w-4 mr-2" />
            {isDepositing ? 'Shielding...' : 'Shield'}
          </Button>
        </div>
      </div>
    </div>
  );
}
