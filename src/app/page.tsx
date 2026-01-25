'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { WalletButton } from '@/components/wallet/WalletButton';
import { Dashboard } from '@/components/dashboard/Dashboard';
import { useWallet } from '@solana/wallet-adapter-react';
import { Shield, ArrowRight, Lock, Zap } from 'lucide-react';

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
      <div className="max-w-5xl mx-auto px-6 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2.5">
          <Shield className="h-5 w-5 text-accent" />
          <span className="font-semibold tracking-tight">Cloak</span>
        </Link>
        <WalletButton />
      </div>
    </header>
  );
}

function Footer() {
  return (
    <footer className="border-t border-border bg-card/50">
      <div className="max-w-5xl mx-auto px-6 py-8">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Shield className="h-4 w-4 text-accent" />
            <span className="text-sm text-muted-foreground">Cloak — Private DCA on Solana</span>
          </div>
          <div className="flex items-center gap-6 text-sm text-muted-foreground">
            <a href="https://github.com" target="_blank" rel="noopener" className="hover:text-foreground transition-colors">
              GitHub
            </a>
            <a href="https://twitter.com" target="_blank" rel="noopener" className="hover:text-foreground transition-colors">
              Twitter
            </a>
            <a href="#" className="hover:text-foreground transition-colors">
              Docs
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}

function Landing() {
  return (
    <div className="pt-16">
      {/* Hero */}
      <section className="py-20 sm:py-28">
        <div className="max-w-5xl mx-auto px-6">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-accent/10 border border-accent/20 mb-8">
              <div className="w-1.5 h-1.5 rounded-full bg-accent" />
              <span className="text-sm font-medium text-accent">Zero-Knowledge Privacy</span>
            </div>

            <h1 className="text-4xl sm:text-5xl font-light tracking-tight mb-6 leading-[1.1]">
              Dollar-cost average<br />
              <span className="text-accent font-normal">without a trace.</span>
            </h1>

            <p className="text-lg text-muted-foreground mb-10 leading-relaxed max-w-lg">
              Accumulate crypto privately on Solana. Your positions, timing, and trading patterns remain cryptographically unlinkable.
            </p>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
              <WalletButton />
              <a
                href="#how-it-works"
                className="inline-flex items-center justify-center gap-2 px-5 py-2.5 text-sm font-medium text-muted-foreground hover:text-foreground border border-border rounded-md hover:border-foreground/20 transition-all"
              >
                Learn more
                <ArrowRight className="h-4 w-4" />
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="border-y border-border bg-card/30">
        <div className="max-w-5xl mx-auto px-6 py-12">
          <div className="grid grid-cols-3 gap-8">
            <div className="text-center">
              <p className="text-2xl sm:text-3xl font-light text-foreground mb-1">$2.4M+</p>
              <p className="text-sm text-muted-foreground">Total Volume</p>
            </div>
            <div className="text-center">
              <p className="text-2xl sm:text-3xl font-light text-foreground mb-1">12,800+</p>
              <p className="text-sm text-muted-foreground">Private Trades</p>
            </div>
            <div className="text-center">
              <p className="text-2xl sm:text-3xl font-light text-foreground mb-1">1,200+</p>
              <p className="text-sm text-muted-foreground">Users</p>
            </div>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how-it-works" className="py-20">
        <div className="max-w-5xl mx-auto px-6">
          <div className="mb-12">
            <p className="text-label text-accent mb-3">How it works</p>
            <h2 className="text-2xl font-light">Three steps to private accumulation</h2>
          </div>

          <div className="grid sm:grid-cols-3 gap-6">
            <StepCard
              number="01"
              title="Deposit"
              description="Send USDC to your shielded balance. Zero-knowledge proofs ensure your deposit is unlinkable to future activity."
            />
            <StepCard
              number="02"
              title="Configure"
              description="Set your DCA parameters: target token, amount per trade, and frequency. Authorize once for all future trades."
            />
            <StepCard
              number="03"
              title="Accumulate"
              description="Trades execute automatically on schedule. Your wallet never directly touches the DEX—complete anonymity."
            />
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-20 border-t border-border">
        <div className="max-w-5xl mx-auto px-6">
          <div className="mb-12">
            <p className="text-label text-accent mb-3">Features</p>
            <h2 className="text-2xl font-light">Built for privacy</h2>
          </div>

          <div className="grid sm:grid-cols-3 gap-6">
            <FeatureCard
              icon={<Shield className="h-5 w-5" />}
              title="Shielded Pool"
              description="Your balance is stored as encrypted commitments. Deposits and withdrawals reveal nothing about amounts or timing."
            />
            <FeatureCard
              icon={<Lock className="h-5 w-5" />}
              title="Session Keys"
              description="Derived keypairs sign trades without exposing your main wallet. Your identity stays completely separate."
            />
            <FeatureCard
              icon={<Zap className="h-5 w-5" />}
              title="Jupiter Integration"
              description="Best-price execution across all Solana DEXs. MEV protection included. Your trades blend with millions of others."
            />
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 border-t border-border">
        <div className="max-w-5xl mx-auto px-6 text-center">
          <h2 className="text-3xl font-light mb-4">Start accumulating privately</h2>
          <p className="text-muted-foreground mb-8 max-w-md mx-auto">
            Connect your wallet to deposit funds and create your first DCA strategy.
          </p>
          <WalletButton />
        </div>
      </section>
    </div>
  );
}

function StepCard({ number, title, description }: {
  number: string;
  title: string;
  description: string;
}) {
  return (
    <div className="p-6 rounded-lg bg-card border border-border hover:border-accent/30 transition-colors">
      <p className="text-accent text-sm font-medium mb-4">{number}</p>
      <h3 className="font-medium mb-2">{title}</h3>
      <p className="text-sm text-muted-foreground leading-relaxed">{description}</p>
    </div>
  );
}

function FeatureCard({ icon, title, description }: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="p-6 rounded-lg bg-card border border-border hover:border-accent/30 transition-colors">
      <div className="text-accent mb-4">{icon}</div>
      <h3 className="font-medium mb-2">{title}</h3>
      <p className="text-sm text-muted-foreground leading-relaxed">{description}</p>
    </div>
  );
}
