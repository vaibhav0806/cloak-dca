'use client';

import { WalletButton } from '@/components/wallet/WalletButton';
import { ShieldedBalance } from '@/components/dashboard/ShieldedBalance';
import { ActiveDCA } from '@/components/dashboard/ActiveDCA';
import { ExecutionHistory } from '@/components/dashboard/ExecutionHistory';
import { CreateDCAModal } from '@/components/dca/CreateDCAModal';
import { Button } from '@/components/ui/button';
import { useAppStore } from '@/store';
import { useWallet } from '@solana/wallet-adapter-react';
import { Shield, Plus, Github, ExternalLink } from 'lucide-react';

export default function Home() {
  const { connected } = useWallet();
  const { setCreateModalOpen } = useAppStore();

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Shield className="h-8 w-8 text-green-500" />
            <span className="text-xl font-bold">Cloak</span>
            <span className="text-xs bg-green-500/10 text-green-500 px-2 py-1 rounded-full">
              Beta
            </span>
          </div>
          <div className="flex items-center gap-4">
            <a
              href="https://github.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              <Github className="h-5 w-5" />
            </a>
            <WalletButton />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        {!connected ? (
          // Landing content for non-connected users
          <div className="max-w-3xl mx-auto text-center py-20">
            <div className="flex justify-center mb-8">
              <div className="relative">
                <Shield className="h-24 w-24 text-green-500" />
                <div className="absolute -right-2 -bottom-2 h-8 w-8 bg-green-500 rounded-full flex items-center justify-center">
                  <Plus className="h-5 w-5 text-background" />
                </div>
              </div>
            </div>
            <h1 className="text-4xl md:text-5xl font-bold mb-6">
              Private Dollar Cost Averaging
            </h1>
            <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
              Accumulate crypto on Solana with complete privacy. Your DCA strategy
              executes from shielded pools, keeping your trading activity
              invisible on-chain.
            </p>

            <div className="flex flex-wrap justify-center gap-4 mb-12">
              <div className="flex items-center gap-2 bg-muted/50 px-4 py-2 rounded-lg">
                <Shield className="h-5 w-5 text-green-500" />
                <span>Privacy-Preserving</span>
              </div>
              <div className="flex items-center gap-2 bg-muted/50 px-4 py-2 rounded-lg">
                <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
                </svg>
                <span>Powered by Solana</span>
              </div>
              <div className="flex items-center gap-2 bg-muted/50 px-4 py-2 rounded-lg">
                <ExternalLink className="h-5 w-5" />
                <span>Jupiter DEX</span>
              </div>
            </div>

            <WalletButton />

            <div className="mt-16 grid md:grid-cols-3 gap-8 text-left">
              <div className="p-6 border border-border/50 rounded-xl">
                <div className="h-12 w-12 bg-green-500/10 rounded-lg flex items-center justify-center mb-4">
                  <span className="text-2xl">1</span>
                </div>
                <h3 className="text-lg font-semibold mb-2">Deposit to Privacy Pool</h3>
                <p className="text-muted-foreground">
                  Shield your USDC in a privacy pool. Your balance becomes invisible
                  to on-chain observers.
                </p>
              </div>
              <div className="p-6 border border-border/50 rounded-xl">
                <div className="h-12 w-12 bg-green-500/10 rounded-lg flex items-center justify-center mb-4">
                  <span className="text-2xl">2</span>
                </div>
                <h3 className="text-lg font-semibold mb-2">Configure Your DCA</h3>
                <p className="text-muted-foreground">
                  Set your target token, amount per trade, and frequency. Sign all
                  transactions in one session.
                </p>
              </div>
              <div className="p-6 border border-border/50 rounded-xl">
                <div className="h-12 w-12 bg-green-500/10 rounded-lg flex items-center justify-center mb-4">
                  <span className="text-2xl">3</span>
                </div>
                <h3 className="text-lg font-semibold mb-2">Automatic Execution</h3>
                <p className="text-muted-foreground">
                  Our keeper executes your trades on schedule. Each swap happens
                  privately through the pool.
                </p>
              </div>
            </div>
          </div>
        ) : (
          // Dashboard for connected users
          <div className="space-y-8">
            <div className="flex items-center justify-between">
              <h1 className="text-2xl font-bold">Dashboard</h1>
              <Button onClick={() => setCreateModalOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Create DCA
              </Button>
            </div>

            <div className="grid gap-8 lg:grid-cols-3">
              <div className="lg:col-span-1">
                <ShieldedBalance />
              </div>
              <div className="lg:col-span-2">
                <ActiveDCA />
              </div>
            </div>

            <ExecutionHistory />
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-border/40 mt-20">
        <div className="container mx-auto px-4 py-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-green-500" />
              <span className="font-semibold">Cloak</span>
            </div>
            <p className="text-sm text-muted-foreground">
              Built for the Privacy.cash hackathon. Use at your own risk on devnet.
            </p>
            <div className="flex items-center gap-4">
              <a
                href="https://privacy.cash"
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-muted-foreground hover:text-foreground"
              >
                Privacy.cash
              </a>
              <a
                href="https://jup.ag"
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-muted-foreground hover:text-foreground"
              >
                Jupiter
              </a>
            </div>
          </div>
        </div>
      </footer>

      {/* Modal */}
      <CreateDCAModal />
    </div>
  );
}
