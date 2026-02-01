'use client';

import { useDCAConfigs } from '@/hooks/useDCAConfigs';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { MoreHorizontal, Pause, Play, X } from 'lucide-react';
import { useWallet } from '@solana/wallet-adapter-react';
import { formatDistanceToNow } from 'date-fns';
import { TOKENS } from '@/lib/solana/constants';
import type { DCAConfig } from '@/types';
import { analytics } from '@/lib/analytics';

function getTokenInfo(mint: string) {
  const token = Object.values(TOKENS).find((t) => t.mint === mint);
  return token || { symbol: mint.slice(0, 4), name: 'Unknown', decimals: 9, mint };
}

interface DCACardProps {
  config: DCAConfig;
  onPause: (id: string) => Promise<void>;
  onResume: (id: string) => Promise<void>;
  onCancel: (id: string) => Promise<void>;
}

function DCACard({ config, onPause, onResume, onCancel }: DCACardProps) {
  const inputToken = getTokenInfo(config.input_token);
  const outputToken = getTokenInfo(config.output_token);
  const progress = (config.completed_trades / config.total_trades) * 100;

  return (
    <div className="card p-6 group border-glow transition-all">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-title">{inputToken.symbol}</span>
            <span className="text-muted-foreground">→</span>
            <span className="text-title">{outputToken.symbol}</span>
          </div>
          <p className="text-sm text-muted-foreground">
            <span className="text-mono">{config.amount_per_trade}</span> per trade
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className={`status-dot ${config.status}`} />
            <span className="text-label">{config.status}</span>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="text-muted-foreground hover:text-foreground p-1 transition-colors opacity-0 group-hover:opacity-100">
                <MoreHorizontal className="h-4 w-4" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="card">
              {config.status === 'active' && (
                <DropdownMenuItem onClick={() => { analytics.dcaPaused(); onPause(config.id); }}>
                  <Pause className="mr-2 h-4 w-4" />
                  Pause
                </DropdownMenuItem>
              )}
              {config.status === 'paused' && (
                <DropdownMenuItem onClick={() => { analytics.dcaResumed(); onResume(config.id); }}>
                  <Play className="mr-2 h-4 w-4" />
                  Resume
                </DropdownMenuItem>
              )}
              {(config.status === 'active' || config.status === 'paused') && (
                <DropdownMenuItem onClick={() => { analytics.dcaCancelled(); onCancel(config.id); }} className="text-destructive">
                  <X className="mr-2 h-4 w-4" />
                  Cancel
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Progress */}
      <div className="mb-6">
        <div className="flex justify-between text-sm mb-2">
          <span className="text-muted-foreground">Progress</span>
          <span className="text-mono">{config.completed_trades}<span className="text-muted-foreground">/{config.total_trades}</span></span>
        </div>
        <div className="progress-track">
          <div className="progress-fill" style={{ width: `${progress}%` }} />
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 pt-4 border-t border-border">
        <div>
          <p className="text-label mb-1">Next</p>
          <p className="text-sm">
            {config.status === 'active'
              ? formatDistanceToNow(new Date(config.next_execution), { addSuffix: true })
              : '—'}
          </p>
        </div>
        <div>
          <p className="text-label mb-1">Deployed</p>
          <p className="text-sm text-mono">
            {(config.completed_trades * config.amount_per_trade).toFixed(2)}
          </p>
        </div>
      </div>
    </div>
  );
}

export function ActiveDCA() {
  const { connected } = useWallet();
  const { isLoading, getActiveConfigs, getPausedConfigs, pauseDCA, resumeDCA, cancelDCA } = useDCAConfigs();

  const activeConfigs = getActiveConfigs();
  const pausedConfigs = getPausedConfigs();
  const allConfigs = [...activeConfigs, ...pausedConfigs];

  if (!connected) return null;

  if (isLoading) {
    return (
      <div>
        <p className="text-label accent mb-4">Strategies</p>
        <div className="grid gap-4 md:grid-cols-2">
          {[1, 2].map((i) => (
            <div key={i} className="card p-6 animate-pulse">
              <div className="h-4 bg-muted rounded w-1/2 mb-4" />
              <div className="h-2 bg-muted rounded mb-6" />
              <div className="grid grid-cols-2 gap-4">
                <div className="h-8 bg-muted rounded" />
                <div className="h-8 bg-muted rounded" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (allConfigs.length === 0) {
    return (
      <div>
        <p className="text-label accent mb-4">Strategies</p>
        <div className="card p-12 text-center">
          <p className="text-muted-foreground mb-1">No active strategies</p>
          <p className="text-sm text-muted-foreground">Create one to begin accumulating</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center gap-2 mb-4">
        <p className="text-label accent">Strategies</p>
        <span className="text-mono text-xs text-muted-foreground">{allConfigs.length}</span>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        {allConfigs.map((config) => (
          <DCACard
            key={config.id}
            config={config}
            onPause={pauseDCA}
            onResume={resumeDCA}
            onCancel={cancelDCA}
          />
        ))}
      </div>
    </div>
  );
}
