'use client';

import { useState, useEffect } from 'react';
import { useShieldedBalance } from '@/hooks/useShieldedBalance';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Shield, RefreshCw, ArrowDownToLine, ArrowUpFromLine, Copy, Check } from 'lucide-react';
import { useWallet } from '@solana/wallet-adapter-react';
import { SUPPORTED_INPUT_TOKENS, SUPPORTED_OUTPUT_TOKENS } from '@/lib/solana/constants';

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

  // Get session wallet address when initialized (only once)
  useEffect(() => {
    if (isInitialized && !sessionWalletAddress) {
      getSessionPublicKey().then(setSessionWalletAddress).catch(console.error);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
    try {
      // Deposit USDC (first supported input token)
      const usdcToken = SUPPORTED_INPUT_TOKENS[0];
      const result = await deposit(usdcToken.mint, Number(depositAmount));
      setDepositAmount('');
      alert(`Successfully deposited ${depositAmount} USDC to privacy pool. Tx: ${result.signature}`);
    } catch (error) {
      console.error('Deposit failed:', error);
      alert(`Deposit failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsDepositing(false);
    }
  };

  const handleWithdraw = async () => {
    if (!withdrawAmount || isNaN(Number(withdrawAmount)) || !withdrawToken || !publicKey) return;

    setIsWithdrawing(true);
    try {
      const result = await withdraw(withdrawToken, Number(withdrawAmount), publicKey.toBase58());
      setWithdrawAmount('');
      setWithdrawToken('');
      setShowWithdraw(false);
      alert(`Successfully withdrew to your wallet. Tx: ${result.signature}`);
      fetchBalances(true);
    } catch (error) {
      console.error('Withdraw failed:', error);
      alert(`Withdraw failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsWithdrawing(false);
    }
  };

  if (!connected) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Shielded Balances
          </CardTitle>
          <CardDescription>
            Connect your wallet to view your private balances
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const totalUsdValue = balances.reduce((acc, b) => acc + (b.usdValue || 0), 0);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <div>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-green-500" />
            Shielded Balances
          </CardTitle>
          <CardDescription>
            Your private token balances in the privacy pool
          </CardDescription>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => fetchBalances(true)}
          disabled={isLoading}
        >
          <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
        </Button>
      </CardHeader>
      <CardContent>
        <div className="mb-4">
          <p className="text-sm text-muted-foreground">Total Value</p>
          <p className="text-2xl font-bold">
            ${totalUsdValue.toLocaleString('en-US', { minimumFractionDigits: 2 })}
          </p>
        </div>

        <div className="space-y-3">
          {balances.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No shielded balances yet. Deposit tokens to get started.
            </p>
          ) : (
            balances.map((balance) => (
              <div
                key={balance.token.mint}
                className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
              >
                <div className="flex items-center gap-3">
                  {balance.token.logoURI ? (
                    <img
                      src={balance.token.logoURI}
                      alt={balance.token.symbol}
                      className="h-8 w-8 rounded-full"
                    />
                  ) : (
                    <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                      <span className="text-xs font-medium">
                        {balance.token.symbol.slice(0, 2)}
                      </span>
                    </div>
                  )}
                  <div>
                    <p className="font-medium">{balance.token.symbol}</p>
                    <p className="text-sm text-muted-foreground">
                      {balance.token.name}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <p className="font-medium">
                      {balance.amount.toLocaleString('en-US', {
                        maximumFractionDigits: balance.token.decimals,
                      })}
                    </p>
                    {balance.usdValue !== undefined && (
                      <p className="text-sm text-muted-foreground">
                        ${balance.usdValue.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                      </p>
                    )}
                  </div>
                  {balance.amount > 0 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setWithdrawToken(balance.token.mint);
                        setWithdrawAmount(balance.amount.toString());
                        setShowWithdraw(true);
                      }}
                    >
                      <ArrowUpFromLine className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Withdraw Section */}
        {showWithdraw && (
          <div className="mt-4 p-3 rounded-lg bg-orange-500/10 border border-orange-500/20">
            <p className="text-sm font-medium text-orange-400 mb-2">Withdraw to Your Wallet</p>
            <div className="flex gap-2">
              <input
                type="number"
                placeholder="Amount"
                value={withdrawAmount}
                onChange={(e) => setWithdrawAmount(e.target.value)}
                className="flex-1 px-3 py-2 rounded-md border bg-background text-sm"
              />
              <Button
                variant="outline"
                onClick={handleWithdraw}
                disabled={isWithdrawing || !withdrawAmount}
              >
                <ArrowUpFromLine className="mr-2 h-4 w-4" />
                {isWithdrawing ? 'Withdrawing...' : 'Withdraw'}
              </Button>
              <Button
                variant="ghost"
                onClick={() => setShowWithdraw(false)}
              >
                Cancel
              </Button>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Tokens will be sent to your connected wallet: {publicKey?.toBase58().slice(0, 8)}...
            </p>
          </div>
        )}

        {/* Session Wallet Info */}
        {sessionWalletAddress && (
          <div className="mt-4 p-3 rounded-lg bg-blue-500/10 border border-blue-500/20">
            <p className="text-sm font-medium text-blue-400 mb-1">Session Wallet</p>
            <p className="text-xs text-muted-foreground mb-2">
              Fund this wallet with USDC + SOL (for fees) before depositing to the privacy pool:
            </p>
            <div className="flex items-center gap-2">
              <code className="flex-1 text-xs bg-background p-2 rounded font-mono overflow-hidden text-ellipsis">
                {sessionWalletAddress}
              </code>
              <Button
                variant="ghost"
                size="sm"
                onClick={copyAddress}
                className="shrink-0"
              >
                {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
              </Button>
            </div>
          </div>
        )}

        <div className="mt-4 space-y-3">
          <div className="flex gap-2">
            <input
              type="number"
              placeholder="Amount (USDC)"
              value={depositAmount}
              onChange={(e) => setDepositAmount(e.target.value)}
              className="flex-1 px-3 py-2 rounded-md border bg-background text-sm"
            />
            <Button
              variant="outline"
              onClick={handleDeposit}
              disabled={isDepositing || !depositAmount}
            >
              <ArrowDownToLine className="mr-2 h-4 w-4" />
              {isDepositing ? 'Depositing...' : 'Deposit USDC'}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            Step 1: Send USDC + SOL to the session wallet above<br/>
            Step 2: Click Deposit to shield tokens into the privacy pool
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
