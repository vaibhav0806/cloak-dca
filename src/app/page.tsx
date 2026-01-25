'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { WalletButton } from '@/components/wallet/WalletButton';
import { Dashboard } from '@/components/dashboard/Dashboard';
import { useWallet } from '@solana/wallet-adapter-react';
import { ArrowRight, Shield, Lock, Zap, ChevronDown } from 'lucide-react';

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
    <header className="fixed top-0 left-0 right-0 z-50 bg-background/70 backdrop-blur-xl border-b border-white/[0.04]">
      <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center">
          <span className="text-[22px] font-semibold tracking-tight">
            cloak<span className="text-accent">.</span>
          </span>
        </Link>
        <nav className="hidden md:flex items-center gap-8 mr-8">
          <a href="#how-it-works" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
            How it works
          </a>
          <a href="#features" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
            Features
          </a>
        </nav>
        <WalletButton />
      </div>
    </header>
  );
}

function Footer() {
  return (
    <footer className="border-t border-white/[0.04]">
      <div className="max-w-6xl mx-auto px-6 py-10">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-6">
            <span className="text-lg font-semibold tracking-tight">
              cloak<span className="text-accent">.</span>
            </span>
            <span className="text-sm text-muted-foreground">Private DCA on Solana</span>
          </div>
          <div className="flex items-center gap-8 text-sm text-muted-foreground">
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
    <div className="relative">
      {/* Ambient background */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[600px] bg-gradient-to-b from-accent/[0.07] via-accent/[0.02] to-transparent rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-0 w-[600px] h-[400px] bg-gradient-to-tr from-accent/[0.04] to-transparent rounded-full blur-3xl" />
      </div>

      {/* Hero */}
      <section className="relative min-h-[90vh] flex items-center pt-16">
        <div className="max-w-6xl mx-auto px-6 w-full">
          <div className="max-w-3xl">
            {/* Eyebrow */}
            <div
              className="inline-flex items-center gap-2.5 px-4 py-2 rounded-full border border-accent/20 bg-accent/[0.08] mb-10"
              style={{ animation: 'fadeSlideUp 0.6s ease-out forwards', opacity: 0 }}
            >
              <div className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse" />
              <span className="text-sm font-medium text-accent/90">Zero-Knowledge Privacy</span>
            </div>

            {/* Headline */}
            <h1
              className="text-[clamp(2.75rem,7vw,5rem)] font-extralight leading-[1.05] tracking-tight mb-8"
              style={{ animation: 'fadeSlideUp 0.6s ease-out 0.1s forwards', opacity: 0 }}
            >
              Accumulate crypto<br />
              <span className="font-normal text-accent">invisibly.</span>
            </h1>

            {/* Subhead */}
            <p
              className="text-xl text-muted-foreground leading-relaxed mb-12 max-w-xl"
              style={{ animation: 'fadeSlideUp 0.6s ease-out 0.2s forwards', opacity: 0 }}
            >
              Private dollar-cost averaging on Solana. Your trades, timing, and
              positions remain cryptographically unlinkable.
            </p>

            {/* CTA */}
            <div
              className="flex flex-col sm:flex-row items-start gap-4"
              style={{ animation: 'fadeSlideUp 0.6s ease-out 0.3s forwards', opacity: 0 }}
            >
              <WalletButton />
              <a
                href="#how-it-works"
                className="group inline-flex items-center gap-2 px-6 py-3 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
              >
                See how it works
                <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
              </a>
            </div>
          </div>
        </div>

        {/* Scroll indicator */}
        <div className="absolute bottom-10 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 text-muted-foreground/50">
          <ChevronDown className="h-5 w-5 animate-bounce" />
        </div>
      </section>

      {/* Stats - commented out for now */}
      {/*
      <section className="relative border-y border-white/[0.04] bg-card/30">
        <div className="max-w-6xl mx-auto px-6 py-16">
          <div className="grid grid-cols-3 gap-8">
            <div className="text-center">
              <p className="text-3xl sm:text-4xl font-extralight text-foreground mb-2">$2.4M+</p>
              <p className="text-sm text-muted-foreground">Total Volume</p>
            </div>
            <div className="text-center">
              <p className="text-3xl sm:text-4xl font-extralight text-foreground mb-2">12,800+</p>
              <p className="text-sm text-muted-foreground">Private Trades</p>
            </div>
            <div className="text-center">
              <p className="text-3xl sm:text-4xl font-extralight text-foreground mb-2">1,200+</p>
              <p className="text-sm text-muted-foreground">Users</p>
            </div>
          </div>
        </div>
      </section>
      */}

      {/* How it works */}
      <section id="how-it-works" className="relative py-28">
        <div className="max-w-6xl mx-auto px-6">
          <div className="flex flex-col lg:flex-row gap-16 lg:gap-24">
            {/* Left side - sticky header */}
            <div className="lg:w-1/3 lg:sticky lg:top-32 lg:self-start">
              <p className="text-label text-accent mb-4">How it works</p>
              <h2 className="text-3xl sm:text-4xl font-extralight leading-tight mb-6">
                Three steps to<br />
                <span className="font-normal">private accumulation</span>
              </h2>
              <p className="text-muted-foreground leading-relaxed">
                Shield your assets, configure your strategy, and let the protocol
                execute trades without exposing your identity.
              </p>
            </div>

            {/* Right side - steps */}
            <div className="lg:w-2/3 space-y-6">
              <StepCard
                number="01"
                title="Shield"
                description="Deposit USDC into the privacy pool. Your funds become encrypted commitments—the origin wallet is now cryptographically unlinkable to your balance."
              />
              <StepCard
                number="02"
                title="Configure"
                description="Set your DCA parameters: target token, amount per trade, and execution frequency. A single signature authorizes all future trades."
              />
              <StepCard
                number="03"
                title="Accumulate"
                description="Trades execute automatically on your schedule. Each swap routes through the shielded pool—your wallet never touches the DEX directly."
              />
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="relative py-28 border-t border-white/[0.04]">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-16">
            <p className="text-label text-accent mb-4">Features</p>
            <h2 className="text-3xl sm:text-4xl font-extralight">
              Privacy by <span className="font-normal">design</span>
            </h2>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            <FeatureCard
              icon={<Shield className="h-6 w-6" />}
              title="Shielded Pool"
              description="UTXO-based privacy pool with encrypted commitments. Deposits and withdrawals reveal nothing about amounts or counterparties."
            />
            <FeatureCard
              icon={<Lock className="h-6 w-6" />}
              title="Session Keys"
              description="Deterministic keypairs derived from your signature authorize trades. Your main wallet identity stays completely separate."
            />
            <FeatureCard
              icon={<Zap className="h-6 w-6" />}
              title="Jupiter Routing"
              description="Best-price execution across all Solana DEXs with built-in MEV protection. Your trades blend seamlessly with millions of others."
            />
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="relative py-28 border-t border-white/[0.04]">
        <div className="absolute inset-0 bg-gradient-to-t from-accent/[0.03] to-transparent pointer-events-none" />
        <div className="max-w-6xl mx-auto px-6 text-center relative">
          <h2 className="text-4xl sm:text-5xl font-extralight mb-6">
            Ready to go <span className="font-normal text-accent">invisible</span>?
          </h2>
          <p className="text-lg text-muted-foreground mb-10 max-w-md mx-auto">
            Connect your wallet to start accumulating privately on Solana.
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
    <div className="group relative p-8 rounded-2xl bg-gradient-to-b from-white/[0.03] to-transparent border border-white/[0.06] hover:border-accent/20 transition-all duration-300">
      <div className="flex items-start gap-6">
        <span className="text-5xl font-extralight text-accent/30 group-hover:text-accent/50 transition-colors">
          {number}
        </span>
        <div className="pt-2">
          <h3 className="text-xl font-medium mb-3 group-hover:text-accent transition-colors">{title}</h3>
          <p className="text-muted-foreground leading-relaxed">{description}</p>
        </div>
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
    <div className="group p-8 rounded-2xl bg-gradient-to-b from-white/[0.03] to-transparent border border-white/[0.06] hover:border-accent/20 transition-all duration-300">
      <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-accent/10 text-accent mb-6 group-hover:bg-accent/20 transition-colors">
        {icon}
      </div>
      <h3 className="text-lg font-medium mb-3">{title}</h3>
      <p className="text-sm text-muted-foreground leading-relaxed">{description}</p>
    </div>
  );
}
