'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { ExternalLink, Check, X, Clock, RefreshCw, ChevronLeft, ChevronRight } from 'lucide-react';
import { useWallet } from '@solana/wallet-adapter-react';
import { format } from 'date-fns';
import { getExplorerUrl } from '@/lib/solana/connection';
import { TOKENS } from '@/lib/solana/constants';
import type { Execution, DCAConfig } from '@/types';

const ITEMS_PER_PAGE = 5;

function getTokenInfo(mint: string) {
  const token = Object.values(TOKENS).find((t) => t.mint === mint);
  return token || { symbol: mint.slice(0, 4), name: 'Unknown', decimals: 9, mint };
}

interface ExecutionRowProps {
  execution: Execution;
  inputToken: string;
  outputToken: string;
}

function ExecutionRow({ execution, inputToken, outputToken }: ExecutionRowProps) {
  const input = getTokenInfo(inputToken);
  const output = getTokenInfo(outputToken);

  const statusConfig = {
    success: { icon: <Check className="h-3 w-3" />, class: 'badge success' },
    failed: { icon: <X className="h-3 w-3" />, class: 'badge error' },
    pending: { icon: <Clock className="h-3 w-3" />, class: 'badge warning' },
  };

  const status = statusConfig[execution.status];

  return (
    <tr className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
      <td className="py-4 pr-4">
        <div className={status.class}>
          {status.icon}
          <span>#{execution.trade_number}</span>
        </div>
      </td>
      <td className="py-4 pr-4">
        <span className="text-mono">{execution.input_amount.toFixed(2)} <span className="text-muted-foreground">{input.symbol}</span></span>
      </td>
      <td className="py-4 pr-4">
        {execution.output_amount ? (
          <span className="text-mono">{execution.output_amount.toFixed(6)} <span className="text-muted-foreground">{output.symbol}</span></span>
        ) : (
          <span className="text-muted-foreground">—</span>
        )}
      </td>
      <td className="py-4 pr-4 text-sm text-muted-foreground">
        {format(new Date(execution.executed_at), 'MMM d, HH:mm')}
      </td>
      <td className="py-4">
        {execution.tx_signature ? (
          <a
            href={getExplorerUrl(execution.tx_signature)}
            target="_blank"
            rel="noopener noreferrer"
            className="text-muted-foreground hover:text-accent transition-colors"
          >
            <ExternalLink className="h-4 w-4" />
          </a>
        ) : (
          <span className="text-muted-foreground">—</span>
        )}
      </td>
    </tr>
  );
}

export function ExecutionHistory() {
  const { connected, publicKey } = useWallet();
  const [executions, setExecutions] = useState<Array<Execution & { input_token: string; output_token: string }>>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const hasFetched = useRef(false);
  const isFetching = useRef(false);

  const totalPages = Math.ceil(executions.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const paginatedExecutions = executions.slice(startIndex, startIndex + ITEMS_PER_PAGE);

  const fetchExecutions = useCallback(async (force = false) => {
    if (!connected || !publicKey) return;
    if (isFetching.current || (hasFetched.current && !force)) return;

    isFetching.current = true;
    setIsLoading(true);
    try {
      const walletAddress = publicKey.toBase58();
      const configsResponse = await fetch('/api/dca/list', {
        headers: { 'x-wallet-address': walletAddress },
      });

      if (!configsResponse.ok) throw new Error('Failed to fetch DCA configs');

      const dcaConfigs: DCAConfig[] = await configsResponse.json();
      const allExecutions: Array<Execution & { input_token: string; output_token: string }> = [];

      for (const config of dcaConfigs) {
        try {
          const execResponse = await fetch(`/api/dca/${config.id}/executions`, {
            headers: { 'x-wallet-address': walletAddress },
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

      allExecutions.sort((a, b) => new Date(b.executed_at).getTime() - new Date(a.executed_at).getTime());
      setExecutions(allExecutions);
      setCurrentPage(1);
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
    if (connected && publicKey) fetchExecutions();
    if (!connected) hasFetched.current = false;
  }, [connected, publicKey]);

  if (!connected) return null;

  return (
    <div className="card">
      <div className="p-6 border-b border-border flex items-center justify-between">
        <p className="text-label accent">Execution Log</p>
        <button
          onClick={() => fetchExecutions(true)}
          disabled={isLoading}
          className="text-muted-foreground hover:text-foreground transition-colors"
        >
          <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      <div className="p-6">
        {isLoading ? (
          <div className="space-y-3" style={{ minHeight: `${ITEMS_PER_PAGE * 57 + 45}px` }}>
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-[53px] bg-muted rounded animate-pulse" />
            ))}
          </div>
        ) : executions.length === 0 ? (
          <div className="flex items-center justify-center" style={{ minHeight: `${ITEMS_PER_PAGE * 57 + 45}px` }}>
            <p className="text-muted-foreground text-sm">
              No executions yet. Trades will appear here.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto" style={{ minHeight: `${ITEMS_PER_PAGE * 57 + 45}px` }}>
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-3 pr-4 text-label font-medium">Trade</th>
                  <th className="text-left py-3 pr-4 text-label font-medium">Input</th>
                  <th className="text-left py-3 pr-4 text-label font-medium">Output</th>
                  <th className="text-left py-3 pr-4 text-label font-medium">Time</th>
                  <th className="text-left py-3 text-label font-medium">Tx</th>
                </tr>
              </thead>
              <tbody>
                {paginatedExecutions.map((execution) => (
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
      </div>

      {/* Pagination */}
      {executions.length > ITEMS_PER_PAGE && (
        <div className="px-6 pb-6 flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            <span className="text-mono">{startIndex + 1}-{Math.min(startIndex + ITEMS_PER_PAGE, executions.length)}</span>
            {' '}of{' '}
            <span className="text-mono">{executions.length}</span>
          </p>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="p-2 text-muted-foreground hover:text-foreground disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="text-sm text-muted-foreground px-2">
              <span className="text-mono">{currentPage}</span> / <span className="text-mono">{totalPages}</span>
            </span>
            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="p-2 text-muted-foreground hover:text-foreground disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
