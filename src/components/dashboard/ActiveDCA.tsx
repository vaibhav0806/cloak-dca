'use client';

import { useDCAConfigs } from '@/hooks/useDCAConfigs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { MoreVertical, Pause, Play, X, Clock, TrendingUp } from 'lucide-react';
import { useWallet } from '@solana/wallet-adapter-react';
import { formatDistanceToNow } from 'date-fns';
import { TOKENS } from '@/lib/solana/constants';
import type { DCAConfig } from '@/types';

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

  const statusColors = {
    active: 'bg-green-500/10 text-green-500 border-green-500/20',
    paused: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20',
    completed: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
    cancelled: 'bg-gray-500/10 text-gray-500 border-gray-500/20',
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
        <div className="flex items-center gap-2">
          <div className="flex -space-x-2">
            {inputToken.logoURI ? (
              <img
                src={inputToken.logoURI}
                alt={inputToken.symbol}
                className="h-8 w-8 rounded-full border-2 border-background"
              />
            ) : (
              <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center border-2 border-background">
                <span className="text-xs">{inputToken.symbol.slice(0, 2)}</span>
              </div>
            )}
            {outputToken.logoURI ? (
              <img
                src={outputToken.logoURI}
                alt={outputToken.symbol}
                className="h-8 w-8 rounded-full border-2 border-background"
              />
            ) : (
              <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center border-2 border-background">
                <span className="text-xs">{outputToken.symbol.slice(0, 2)}</span>
              </div>
            )}
          </div>
          <div>
            <p className="font-medium">
              {inputToken.symbol} → {outputToken.symbol}
            </p>
            <p className="text-sm text-muted-foreground">
              {config.amount_per_trade} {inputToken.symbol} per trade
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className={statusColors[config.status]}>
            {config.status}
          </Badge>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {config.status === 'active' ? (
                <DropdownMenuItem onClick={() => onPause(config.id)}>
                  <Pause className="mr-2 h-4 w-4" />
                  Pause
                </DropdownMenuItem>
              ) : config.status === 'paused' ? (
                <DropdownMenuItem onClick={() => onResume(config.id)}>
                  <Play className="mr-2 h-4 w-4" />
                  Resume
                </DropdownMenuItem>
              ) : null}
              {(config.status === 'active' || config.status === 'paused') && (
                <DropdownMenuItem
                  onClick={() => onCancel(config.id)}
                  className="text-destructive"
                >
                  <X className="mr-2 h-4 w-4" />
                  Cancel
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div>
            <div className="flex justify-between text-sm mb-1">
              <span className="text-muted-foreground">Progress</span>
              <span>
                {config.completed_trades} / {config.total_trades} trades
              </span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>

          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-muted-foreground">Next execution</p>
                <p className="font-medium">
                  {config.status === 'active'
                    ? formatDistanceToNow(new Date(config.next_execution), {
                        addSuffix: true,
                      })
                    : '-'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-muted-foreground">Total invested</p>
                <p className="font-medium">
                  {(config.completed_trades * config.amount_per_trade).toFixed(2)}{' '}
                  {inputToken.symbol}
                </p>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function ActiveDCA() {
  const { connected } = useWallet();
  const { configs, isLoading, getActiveConfigs, getPausedConfigs, pauseDCA, resumeDCA, cancelDCA } = useDCAConfigs();

  const activeConfigs = getActiveConfigs();
  const pausedConfigs = getPausedConfigs();
  const allActiveConfigs = [...activeConfigs, ...pausedConfigs];

  if (!connected) {
    return null;
  }

  if (isLoading) {
    return (
      <div className="space-y-4">
        <h2 className="text-xl font-semibold">Active DCAs</h2>
        <div className="grid gap-4 md:grid-cols-2">
          {[1, 2].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader>
                <div className="h-8 bg-muted rounded w-3/4" />
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="h-4 bg-muted rounded" />
                  <div className="h-4 bg-muted rounded w-1/2" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (allActiveConfigs.length === 0) {
    return (
      <div className="space-y-4">
        <h2 className="text-xl font-semibold">Active DCAs</h2>
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-10">
            <TrendingUp className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground text-center">
              No active DCAs yet. Create one to start dollar-cost averaging privately.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold">Active DCAs</h2>
      <div className="grid gap-4 md:grid-cols-2">
        {allActiveConfigs.map((config) => (
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
