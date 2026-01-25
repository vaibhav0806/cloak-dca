'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { WalletButton } from '@/components/wallet/WalletButton';
import { Dashboard } from '@/components/dashboard/Dashboard';
import { useWallet } from '@solana/wallet-adapter-react';
import { Shield, ArrowRight, Lock, Zap, RefreshCw } from 'lucide-react';

export default function Home() {
  const { connected, connecting } = useWallet();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return <div className="min-h-screen bg-background" />;
  }

  if (connecting) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <Header />
        <main className="flex-1 flex items-center justify-center">
          <div className="relative">
            <div className="h-8 w-8 rounded-full border-2 border-muted" />
            <div className="absolute inset-0 h-8 w-8 rounded-full border-2 border-transparent border-t-accent animate-spin" />
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      <main className="flex-1">
        {!connected ? <Landing /> : <Dashboard />}
      </main>
      {!connected && <Footer />}
    </div>
  );
}

function Header() {
  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-md border-b border-border">
      <div className="max-w-3xl mx-auto px-6 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-accent/10">
            <Shield className="h-4 w-4 text-accent" />
          </div>
          <span className="font-medium">Cloak</span>
        </Link>
        <WalletButton />
      </div>
    </header>
  );
}

function Footer() {
  return (
    <footer className="border-t border-border">
      <div className="max-w-3xl mx-auto px-6 py-6">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-muted-foreground">
          <span>Private DCA on Solana</span>
          <div className="flex items-center gap-6">
            <a href="https://github.com" target="_blank" rel="noopener" className="hover:text-foreground transition-colors">
              GitHub
            </a>
            <a href="https://twitter.com" target="_blank" rel="noopener" className="hover:text-foreground transition-colors">
              Twitter
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}

function Landing() {
  return (
    <div className="min-h-screen pt-24 pb-20">
      <div className="max-w-3xl mx-auto px-6">
        {/* Hero */}
        <section className="py-16 sm:py-24">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-accent/10 border border-accent/20 mb-6">
            <Shield className="h-3.5 w-3.5 text-accent" />
            <span className="text-sm text-accent">Zero-Knowledge DCA</span>
          </div>

          <h1 className="text-4xl sm:text-5xl font-light tracking-tight mb-6">
            Accumulate privately
          </h1>

          <p className="text-lg text-muted-foreground max-w-xl mb-10 leading-relaxed">
            Dollar-cost average on Solana without leaving a trace.
            Your positions, timing, and trading patterns remain cryptographically unlinkable.
          </p>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <WalletButton />
            <a
              href="#how"
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              How it works
              <ArrowRight className="h-4 w-4" />
            </a>
          </div>
        </section>

        {/* How it works */}
        <section id="how" className="py-16 border-t border-border">
          <h2 className="text-lg font-medium mb-8">How it works</h2>

          <div className="grid gap-6">
            <StepCard
              number="1"
              title="Deposit"
              description="Send USDC to your private balance. Funds are shielded using zero-knowledge proofs, making your deposit unlinkable to future trades."
            />
            <StepCard
              number="2"
              title="Configure"
              description="Set up your DCA strategy: choose your target token, amount per trade, and frequency. Sign once to authorize all future executions."
            />
            <StepCard
              number="3"
              title="Accumulate"
              description="Trades execute automatically on schedule. Each swap routes through the privacy pool—your wallet never directly interacts with the DEX."
            />
          </div>
        </section>

        {/* Features */}
        <section className="py-16 border-t border-border">
          <h2 className="text-lg font-medium mb-8">Privacy by design</h2>

          <div className="grid sm:grid-cols-3 gap-4">
            <FeatureCard
              icon={<Shield className="h-5 w-5" />}
              title="Shielded pool"
              description="Encrypted commitments hide your balance and transaction history."
            />
            <FeatureCard
              icon={<Lock className="h-5 w-5" />}
              title="Session keys"
              description="Derived keypairs authorize trades without exposing your main wallet."
            />
            <FeatureCard
              icon={<Zap className="h-5 w-5" />}
              title="Jupiter routing"
              description="Best-price execution across Solana DEXs with MEV protection."
            />
          </div>
        </section>

        {/* CTA */}
        <section className="py-16 border-t border-border text-center">
          <h2 className="text-2xl font-light mb-4">Ready to start?</h2>
          <p className="text-muted-foreground mb-8">
            Connect your wallet to begin accumulating privately.
          </p>
          <WalletButton />
        </section>
      </div>
    </div>
  );
}

function StepCard({ number, title, description }: {
  number: string;
  title: string;
  description: string;
}) {
  return (
    <div className="flex gap-4 p-5 rounded-lg bg-card border border-border">
      <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-sm font-medium shrink-0">
        {number}
      </div>
      <div>
        <h3 className="font-medium mb-1">{title}</h3>
        <p className="text-sm text-muted-foreground leading-relaxed">{description}</p>
      </div>
    </div>
  );
}

function FeatureCard({ icon, title, description }: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="p-5 rounded-lg bg-card border border-border">
      <div className="text-accent mb-3">{icon}</div>
      <h3 className="font-medium mb-1">{title}</h3>
      <p className="text-sm text-muted-foreground leading-relaxed">{description}</p>
    </div>
  );
}
