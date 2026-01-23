'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
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
import { Badge } from '@/components/ui/badge';
import { useAppStore } from '@/store';
import { useDCAConfigs } from '@/hooks/useDCAConfigs';
import { useShieldedBalance } from '@/hooks/useShieldedBalance';
import {
  SUPPORTED_INPUT_TOKENS,
  SUPPORTED_OUTPUT_TOKENS,
  FREQUENCY_OPTIONS,
} from '@/lib/solana/constants';
import { Shield, AlertCircle, Loader2, ArrowRight } from 'lucide-react';
import type { TokenInfo } from '@/types';

export function CreateDCAModal() {
  const { isCreateModalOpen, setCreateModalOpen } = useAppStore();
  const { createDCA } = useDCAConfigs();
  const { balances } = useShieldedBalance();

  const [inputToken, setInputToken] = useState<TokenInfo | null>(
    SUPPORTED_INPUT_TOKENS[0]
  );
  const [outputToken, setOutputToken] = useState<TokenInfo | null>(
    SUPPORTED_OUTPUT_TOKENS[0]
  );
  const [totalAmount, setTotalAmount] = useState('');
  const [amountPerTrade, setAmountPerTrade] = useState('');
  const [frequencyHours, setFrequencyHours] = useState(24);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const inputBalance = inputToken
    ? balances.find((b) => b.token.mint === inputToken.mint)?.amount || 0
    : 0;

  const totalTrades =
    totalAmount && amountPerTrade
      ? Math.ceil(parseFloat(totalAmount) / parseFloat(amountPerTrade))
      : 0;

  const estimatedDuration =
    totalTrades > 0
      ? `${Math.ceil((totalTrades * frequencyHours) / 24)} days`
      : '-';

  const handleSubmit = async () => {
    if (!inputToken || !outputToken) {
      setError('Please select input and output tokens');
      return;
    }

    const total = parseFloat(totalAmount);
    const perTrade = parseFloat(amountPerTrade);

    if (isNaN(total) || total <= 0) {
      setError('Please enter a valid total amount');
      return;
    }

    if (isNaN(perTrade) || perTrade <= 0) {
      setError('Please enter a valid amount per trade');
      return;
    }

    if (perTrade > total) {
      setError('Amount per trade cannot exceed total amount');
      return;
    }

    if (total > inputBalance) {
      setError('Insufficient shielded balance');
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
        setCreateModalOpen(false);
        resetForm();
      } else {
        setError('Failed to create DCA. Please try again.');
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
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-green-500" />
            Create Private DCA
          </DialogTitle>
          <DialogDescription>
            Set up a dollar-cost averaging strategy with privacy protection.
            Your trades will be executed from the privacy pool.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Token Selection */}
          <div className="flex items-center gap-4">
            <div className="flex-1 space-y-2">
              <label className="text-sm font-medium">From</label>
              <Select
                value={inputToken?.mint}
                onValueChange={(mint) =>
                  setInputToken(
                    SUPPORTED_INPUT_TOKENS.find((t) => t.mint === mint) || null
                  )
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select token" />
                </SelectTrigger>
                <SelectContent>
                  {SUPPORTED_INPUT_TOKENS.map((token) => (
                    <SelectItem key={token.mint} value={token.mint}>
                      <div className="flex items-center gap-2">
                        {token.logoURI && (
                          <img
                            src={token.logoURI}
                            alt={token.symbol}
                            className="h-5 w-5 rounded-full"
                          />
                        )}
                        <span>{token.symbol}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {inputToken && (
                <p className="text-xs text-muted-foreground">
                  Shielded balance: {inputBalance.toFixed(2)} {inputToken.symbol}
                </p>
              )}
            </div>

            <ArrowRight className="h-5 w-5 text-muted-foreground mt-6" />

            <div className="flex-1 space-y-2">
              <label className="text-sm font-medium">To</label>
              <Select
                value={outputToken?.mint}
                onValueChange={(mint) =>
                  setOutputToken(
                    SUPPORTED_OUTPUT_TOKENS.find((t) => t.mint === mint) || null
                  )
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select token" />
                </SelectTrigger>
                <SelectContent>
                  {SUPPORTED_OUTPUT_TOKENS.map((token) => (
                    <SelectItem key={token.mint} value={token.mint}>
                      <div className="flex items-center gap-2">
                        {token.logoURI && (
                          <img
                            src={token.logoURI}
                            alt={token.symbol}
                            className="h-5 w-5 rounded-full"
                          />
                        )}
                        <span>{token.symbol}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Amount Configuration */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Total Amount</label>
              <Input
                type="number"
                placeholder="1000"
                value={totalAmount}
                onChange={(e) => setTotalAmount(e.target.value)}
                min="0"
                step="0.01"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Amount per Trade</label>
              <Input
                type="number"
                placeholder="100"
                value={amountPerTrade}
                onChange={(e) => setAmountPerTrade(e.target.value)}
                min="0"
                step="0.01"
              />
            </div>
          </div>

          {/* Frequency */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Frequency</label>
            <Select
              value={frequencyHours.toString()}
              onValueChange={(v) => setFrequencyHours(parseInt(v))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
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
            <div className="p-4 bg-muted/50 rounded-lg space-y-2">
              <h4 className="font-medium">Summary</h4>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <span className="text-muted-foreground">Total trades:</span>
                  <span className="ml-2 font-medium">{totalTrades}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Duration:</span>
                  <span className="ml-2 font-medium">{estimatedDuration}</span>
                </div>
              </div>
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="flex items-center gap-2 p-3 bg-destructive/10 text-destructive rounded-lg">
              <AlertCircle className="h-4 w-4" />
              <span className="text-sm">{error}</span>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting || totalTrades === 0}>
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Creating...
              </>
            ) : (
              <>
                <Shield className="mr-2 h-4 w-4" />
                Create DCA
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
