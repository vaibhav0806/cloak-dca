'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ExternalLink, CheckCircle, XCircle, Clock, History, RefreshCw } from 'lucide-react';
import { useWallet } from '@solana/wallet-adapter-react';
import { format } from 'date-fns';
import { getExplorerUrl } from '@/lib/solana/connection';
import { TOKENS } from '@/lib/solana/constants';
import type { Execution, DCAConfig } from '@/types';

function getTokenInfo(mint: string): { symbol: string; name: string; decimals: number; logoURI?: string; mint: string } {
  const token = Object.values(TOKENS).find((t) => t.mint === mint);
  if (token) {
    return token;
  }
  return {
    symbol: mint.slice(0, 4),
    name: 'Unknown',
    decimals: 9,
    mint,
  };
}

interface ExecutionRowProps {
  execution: Execution;
  inputToken: string;
  outputToken: string;
}

function ExecutionRow({ execution, inputToken, outputToken }: ExecutionRowProps) {
  const input = getTokenInfo(inputToken);
  const output = getTokenInfo(outputToken);

  const statusIcons = {
    success: <CheckCircle className="h-4 w-4 text-green-500" />,
    failed: <XCircle className="h-4 w-4 text-destructive" />,
    pending: <Clock className="h-4 w-4 text-yellow-500" />,
  };

  const statusColors = {
    success: 'bg-green-500/10 text-green-500',
    failed: 'bg-destructive/10 text-destructive',
    pending: 'bg-yellow-500/10 text-yellow-500',
  };

  return (
    <tr className="border-b border-border/50 hover:bg-muted/50">
      <td className="py-3 px-4">
        <div className="flex items-center gap-2">
          {statusIcons[execution.status]}
          <span className="font-medium">#{execution.trade_number}</span>
        </div>
      </td>
      <td className="py-3 px-4">
        <span>
          {execution.input_amount.toFixed(2)} {input.symbol}
        </span>
      </td>
      <td className="py-3 px-4">
        {execution.output_amount ? (
          <span>
            {execution.output_amount.toFixed(6)} {output.symbol}
          </span>
        ) : (
          <span className="text-muted-foreground">-</span>
        )}
      </td>
      <td className="py-3 px-4">
        <Badge variant="outline" className={statusColors[execution.status]}>
          {execution.status}
        </Badge>
      </td>
      <td className="py-3 px-4 text-muted-foreground">
        {format(new Date(execution.executed_at), 'MMM d, yyyy HH:mm')}
      </td>
      <td className="py-3 px-4">
        {execution.tx_signature ? (
          <Button
            variant="ghost"
            size="sm"
            className="h-8 px-2"
            onClick={() =>
              window.open(getExplorerUrl(execution.tx_signature!), '_blank')
            }
          >
            <ExternalLink className="h-4 w-4" />
          </Button>
        ) : (
          <span className="text-muted-foreground">-</span>
        )}
      </td>
    </tr>
  );
}

export function ExecutionHistory() {
  const { connected, publicKey } = useWallet();
  const [executions, setExecutions] = useState<
    Array<Execution & { input_token: string; output_token: string }>
  >([]);
  const [isLoading, setIsLoading] = useState(false);
  const hasFetched = useRef(false);
  const isFetching = useRef(false);

  const fetchExecutions = useCallback(async (force = false) => {
    if (!connected || !publicKey) return;
    // Prevent duplicate fetches using refs
    if (isFetching.current || (hasFetched.current && !force)) return;

    isFetching.current = true;
    setIsLoading(true);
    try {
      const walletAddress = publicKey.toBase58();

      // First, fetch all DCA configs for this wallet
      const configsResponse = await fetch('/api/dca/list', {
        headers: {
          'x-wallet-address': walletAddress,
        },
      });

      if (!configsResponse.ok) {
        throw new Error('Failed to fetch DCA configs');
      }

      const dcaConfigs: DCAConfig[] = await configsResponse.json();

      // Fetch executions for each DCA config
      const allExecutions: Array<Execution & { input_token: string; output_token: string }> = [];

      for (const config of dcaConfigs) {
        try {
          const execResponse = await fetch(`/api/dca/${config.id}/executions`, {
            headers: {
              'x-wallet-address': walletAddress,
            },
          });

          if (execResponse.ok) {
            const data = await execResponse.json();
            const configExecutions = (data.executions || []).map((exec: Execution) => ({
              ...exec,
              input_token: config.input_token,
              output_token: config.output_token,
            }));
            allExecutions.push(...configExecutions);
          }
        } catch (error) {
          console.error(`Error fetching executions for DCA ${config.id}:`, error);
        }
      }

      // Sort by executed_at descending (most recent first)
      allExecutions.sort((a, b) =>
        new Date(b.executed_at).getTime() - new Date(a.executed_at).getTime()
      );

      setExecutions(allExecutions);
      hasFetched.current = true;
    } catch (error) {
      console.error('Error fetching executions:', error);
      setExecutions([]);
    } finally {
      setIsLoading(false);
      isFetching.current = false;
    }
  }, [connected, publicKey]);

  useEffect(() => {
    if (connected && publicKey) {
      fetchExecutions();
    }
    // Reset when wallet disconnects
    if (!connected) {
      hasFetched.current = false;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [connected, publicKey]);

  if (!connected) {
    return null;
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <div>
          <CardTitle className="flex items-center gap-2">
            <History className="h-5 w-5" />
            Execution History
          </CardTitle>
          <CardDescription>
            Recent DCA trade executions across all your configurations
          </CardDescription>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => fetchExecutions(true)}
          disabled={isLoading}
        >
          <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
        </Button>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-12 bg-muted rounded animate-pulse" />
            ))}
          </div>
        ) : executions.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10">
            <History className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground text-center">
              No executions yet. Your DCA trades will appear here.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">
                    Trade
                  </th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">
                    Input
                  </th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">
                    Output
                  </th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">
                    Status
                  </th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">
                    Time
                  </th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">
                    Tx
                  </th>
                </tr>
              </thead>
              <tbody>
                {executions.map((execution) => (
                  <ExecutionRow
                    key={execution.id}
                    execution={execution}
                    inputToken={execution.input_token}
                    outputToken={execution.output_token}
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
