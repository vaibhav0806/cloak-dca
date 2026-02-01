'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useAppStore } from '@/store';
import { useDCAConfigs } from '@/hooks/useDCAConfigs';
import { useShieldedBalance } from '@/hooks/useShieldedBalance';
import {
  SUPPORTED_INPUT_TOKENS,
  SUPPORTED_OUTPUT_TOKENS,
  FREQUENCY_OPTIONS,
} from '@/lib/solana/constants';
import { AlertCircle, Loader2 } from 'lucide-react';
import type { TokenInfo, DCAConfig } from '@/types';
import { analytics } from '@/lib/analytics';

// Privacy Cash has a minimum withdrawal of ~1 USDC to prevent correlation attacks
const MIN_AMOUNT_PER_TRADE = 1;

export function CreateDCAModal() {
  const { isCreateModalOpen, setCreateModalOpen } = useAppStore();
  const { createDCA, getActiveConfigs } = useDCAConfigs();
  const { balances } = useShieldedBalance();

  const [inputToken, setInputToken] = useState<TokenInfo | null>(SUPPORTED_INPUT_TOKENS[0]);
  const [outputToken, setOutputToken] = useState<TokenInfo | null>(SUPPORTED_OUTPUT_TOKENS[0]);
  const [totalAmount, setTotalAmount] = useState('');
  const [amountPerTrade, setAmountPerTrade] = useState('');
  const [frequencyHours, setFrequencyHours] = useState(24);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const inputBalance = inputToken
    ? balances.find((b) => b.token.mint === inputToken.mint)?.amount || 0
    : 0;

  const totalTrades = totalAmount && amountPerTrade
    ? Math.ceil(parseFloat(totalAmount) / parseFloat(amountPerTrade))
    : 0;

  const estimatedDuration = totalTrades > 0
    ? `${Math.ceil((totalTrades * frequencyHours) / 24)} days`
    : '—';

  // Calculate if this new DCA would cause underfunding
  const activeConfigs = getActiveConfigs();
  const existingDCARequirement = activeConfigs
    .filter((c: DCAConfig) => c.input_token === inputToken?.mint)
    .reduce((sum: number, c: DCAConfig) => sum + c.amount_per_trade, 0);
  const newPerTradeAmount = parseFloat(amountPerTrade) || 0;
  const totalRequiredPerRound = existingDCARequirement + newPerTradeAmount;
  const wouldBeUnderfunded = newPerTradeAmount > 0 && totalRequiredPerRound > inputBalance;

  const handleSubmit = async () => {
    if (!inputToken || !outputToken) {
      setError('Select tokens');
      return;
    }

    const total = parseFloat(totalAmount);
    const perTrade = parseFloat(amountPerTrade);

    if (isNaN(total) || total <= 0) {
      setError('Enter valid total');
      return;
    }
    if (isNaN(perTrade) || perTrade <= 0) {
      setError('Enter valid amount per trade');
      return;
    }
    if (perTrade < MIN_AMOUNT_PER_TRADE) {
      setError(`Minimum ${MIN_AMOUNT_PER_TRADE} ${inputToken.symbol} per trade`);
      return;
    }
    if (perTrade > total) {
      setError('Per-trade exceeds total');
      return;
    }

    setError(null);
    setIsSubmitting(true);

    try {
      const result = await createDCA({
        inputToken,
        outputToken,
        totalAmount: total,
        amountPerTrade: perTrade,
        frequencyHours,
      });

      if (result) {
        analytics.dcaCreated(outputToken.symbol, total, frequencyHours);
        setCreateModalOpen(false);
        resetForm();
      } else {
        setError('Failed to create strategy');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setTotalAmount('');
    setAmountPerTrade('');
    setFrequencyHours(24);
    setError(null);
  };

  const handleClose = () => {
    setCreateModalOpen(false);
    resetForm();
  };

  return (
    <Dialog open={isCreateModalOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md card !p-0 border-border">
        <DialogHeader className="p-6 pb-0">
          <DialogTitle className="text-headline">New Strategy</DialogTitle>
        </DialogHeader>

        <div className="space-y-5 p-6">
          {/* Token Selection */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-label block mb-2">From</label>
              <Select
                value={inputToken?.mint}
                onValueChange={(mint) => setInputToken(SUPPORTED_INPUT_TOKENS.find((t) => t.mint === mint) || null)}
              >
                <SelectTrigger className="bg-muted border-border">
                  <SelectValue placeholder="Select" />
                </SelectTrigger>
                <SelectContent className="card border-border">
                  {SUPPORTED_INPUT_TOKENS.map((token) => (
                    <SelectItem key={token.mint} value={token.mint}>
                      <div className="flex items-center gap-2">
                        {token.logoURI && <img src={token.logoURI} alt="" className="h-4 w-4 rounded-full" />}
                        {token.symbol}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {inputToken && (
                <p className="text-xs text-muted-foreground mt-2">
                  Available: <span className="text-mono">{inputBalance.toFixed(2)}</span>
                </p>
              )}
            </div>

            <div>
              <label className="text-label block mb-2">To</label>
              <Select
                value={outputToken?.mint}
                onValueChange={(mint) => setOutputToken(SUPPORTED_OUTPUT_TOKENS.find((t) => t.mint === mint) || null)}
              >
                <SelectTrigger className="bg-muted border-border">
                  <SelectValue placeholder="Select" />
                </SelectTrigger>
                <SelectContent className="card border-border">
                  {SUPPORTED_OUTPUT_TOKENS.map((token) => (
                    <SelectItem key={token.mint} value={token.mint}>
                      <div className="flex items-center gap-2">
                        {token.logoURI && <img src={token.logoURI} alt="" className="h-4 w-4 rounded-full" />}
                        {token.symbol}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Amounts */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-label block mb-2">Total</label>
              <Input
                type="number"
                placeholder="1000"
                value={totalAmount}
                onChange={(e) => setTotalAmount(e.target.value)}
                className="text-mono bg-muted border-border"
              />
            </div>
            <div>
              <label className="text-label block mb-2">Per Trade</label>
              <Input
                type="number"
                placeholder="10"
                min={MIN_AMOUNT_PER_TRADE}
                value={amountPerTrade}
                onChange={(e) => setAmountPerTrade(e.target.value)}
                className="text-mono bg-muted border-border"
              />
              <p className="text-xs text-muted-foreground mt-1">Min: {MIN_AMOUNT_PER_TRADE} {inputToken?.symbol || 'USDC'}</p>
            </div>
          </div>

          {/* Frequency */}
          <div>
            <label className="text-label block mb-2">Frequency</label>
            <Select value={frequencyHours.toString()} onValueChange={(v) => setFrequencyHours(parseFloat(v))}>
              <SelectTrigger className="bg-muted border-border">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="card border-border">
                {FREQUENCY_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value.toString()}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Summary */}
          {totalTrades > 0 && (
            <div className="p-4 bg-muted rounded-md border border-border">
              <p className="text-label accent mb-3">Summary</p>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Trades</p>
                  <p className="text-mono">{totalTrades}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Duration</p>
                  <p className="text-mono">{estimatedDuration}</p>
                </div>
              </div>
              {wouldBeUnderfunded && (
                <div className="flex items-center gap-2 text-xs text-orange-400/90 mt-3 pt-3 border-t border-border/50">
                  <div className="w-1 h-1 rounded-full bg-orange-400/90" />
                  <span>Balance may not cover all active DCAs</span>
                </div>
              )}
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="flex items-center gap-2 p-3 bg-destructive/10 text-destructive rounded-md text-sm border border-destructive/20">
              <AlertCircle className="h-4 w-4 shrink-0" />
              {error}
            </div>
          )}
        </div>

        <DialogFooter className="p-6 pt-0 gap-2">
          <Button variant="ghost" onClick={handleClose}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={isSubmitting || totalTrades === 0 || parseFloat(amountPerTrade) < MIN_AMOUNT_PER_TRADE}>
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Creating...
              </>
            ) : (
              'Create'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
