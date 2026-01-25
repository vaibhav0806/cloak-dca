'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { WalletButton } from '@/components/wallet/WalletButton';
import { Dashboard } from '@/components/dashboard/Dashboard';
import { useWallet } from '@solana/wallet-adapter-react';

// Floating particles that dissolve - represents data becoming untraceable
function DissolveParticles() {
  const particles = useMemo(() => {
    return Array.from({ length: 40 }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 100,
      size: 2 + Math.random() * 4,
      delay: Math.random() * 8,
      duration: 8 + Math.random() * 12,
    }));
  }, []);

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {particles.map((p) => (
        <div
          key={p.id}
          className="absolute rounded-full"
          style={{
            left: `${p.x}%`,
            top: `${p.y}%`,
            width: p.size,
            height: p.size,
            background: `radial-gradient(circle, var(--accent) 0%, transparent 70%)`,
            animation: `float ${p.duration}s ease-in-out infinite, pulse-glow ${p.duration / 2}s ease-in-out infinite`,
            animationDelay: `${p.delay}s`,
            opacity: 0.3,
          }}
        />
      ))}
    </div>
  );
}

// ASCII art logo
function AsciiLogo() {
  return (
    <pre className="text-[8px] md:text-[10px] leading-tight text-muted-foreground/30 font-mono select-none">
{`
 ██████╗██╗      ██████╗  █████╗ ██╗  ██╗
██╔════╝██║     ██╔═══██╗██╔══██╗██║ ██╔╝
██║     ██║     ██║   ██║███████║█████╔╝
██║     ██║     ██║   ██║██╔══██║██╔═██╗
╚██████╗███████╗╚██████╔╝██║  ██║██║  ██╗
 ╚═════╝╚══════╝ ╚═════╝ ╚═╝  ╚═╝╚═╝  ╚═╝
`}
    </pre>
  );
}

// Typing effect for terminal text
function TypeWriter({ text, delay = 0 }: { text: string; delay?: number }) {
  const [displayed, setDisplayed] = useState('');
  const [started, setStarted] = useState(false);

  useEffect(() => {
    const startTimer = setTimeout(() => setStarted(true), delay);
    return () => clearTimeout(startTimer);
  }, [delay]);

  useEffect(() => {
    if (!started) return;
    let i = 0;
    const timer = setInterval(() => {
      if (i < text.length) {
        setDisplayed(text.slice(0, i + 1));
        i++;
      } else {
        clearInterval(timer);
      }
    }, 40);
    return () => clearInterval(timer);
  }, [text, started]);

  return (
    <span>
      {displayed}
      {displayed.length < text.length && started && (
        <span className="animate-pulse">▊</span>
      )}
    </span>
  );
}

// Scramble text effect on hover
function ScrambleText({ text, className = '' }: { text: string; className?: string }) {
  const [display, setDisplay] = useState(text);
  const chars = '!@#$%^&*()_+-=[]{}|;:,.<>?/~`0123456789';

  const scramble = () => {
    let iteration = 0;
    const interval = setInterval(() => {
      setDisplay(
        text
          .split('')
          .map((char, idx) => {
            if (char === ' ') return ' ';
            if (idx < iteration) return text[idx];
            return chars[Math.floor(Math.random() * chars.length)];
          })
          .join('')
      );
      iteration += 1 / 2;
      if (iteration >= text.length) {
        clearInterval(interval);
        setDisplay(text);
      }
    }, 30);
  };

  return (
    <span className={className} onMouseEnter={scramble}>
      {display}
    </span>
  );
}

// Data stream visualization
function DataStream() {
  const streams = useMemo(() => {
    return Array.from({ length: 8 }, (_, i) => ({
      id: i,
      chars: Array.from({ length: 20 }, () =>
        Math.random() > 0.5 ? '1' : '0'
      ).join(''),
      left: 10 + i * 12,
      duration: 15 + Math.random() * 10,
      delay: Math.random() * 5,
    }));
  }, []);

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-[0.03]">
      {streams.map((s) => (
        <div
          key={s.id}
          className="absolute text-accent font-mono text-xs whitespace-pre"
          style={{
            left: `${s.left}%`,
            top: '-100%',
            writingMode: 'vertical-rl',
            animation: `matrix-fall ${s.duration}s linear infinite`,
            animationDelay: `${s.delay}s`,
          }}
        >
          {s.chars}
        </div>
      ))}
    </div>
  );
}

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
      <div className="min-h-screen flex flex-col bg-background gradient-void">
        <Header />
        <main className="flex-1 flex items-center justify-center">
          <div className="flex flex-col items-center gap-4">
            <div className="h-6 w-6 border border-accent border-t-transparent rounded-full animate-spin" />
            <span className="text-mono text-muted-foreground text-sm">
              <TypeWriter text="ESTABLISHING SECURE CONNECTION..." />
            </span>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col gradient-void">
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
    <header className="fixed top-0 left-0 right-0 z-50 border-b border-border/50">
      <div className="absolute inset-0 bg-background/60 backdrop-blur-xl" />
      <div className="relative max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-3 group">
          <div className="w-8 h-8 border border-accent/50 flex items-center justify-center group-hover:border-accent transition-colors">
            <div className="w-3 h-3 bg-accent/80 group-hover:bg-accent transition-colors" />
          </div>
          <span className="text-title tracking-tight">
            <ScrambleText text="CLOAK" />
          </span>
        </Link>
        <WalletButton />
      </div>
    </header>
  );
}

function Footer() {
  return (
    <footer className="border-t border-border/50 relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-4 sm:gap-6">
            <span className="text-mono text-[10px] sm:text-xs text-muted-foreground">
              v1.0.0
            </span>
            <span className="text-muted-foreground/30">|</span>
            <span className="text-mono text-[10px] sm:text-xs text-muted-foreground">
              SOLANA MAINNET
            </span>
          </div>
          <div className="flex items-center gap-4 sm:gap-8 text-mono text-[10px] sm:text-xs">
            <a href="https://github.com" target="_blank" rel="noopener" className="text-muted-foreground hover:text-accent transition-colors">
              [GITHUB]
            </a>
            <a href="https://twitter.com" target="_blank" rel="noopener" className="text-muted-foreground hover:text-accent transition-colors">
              [TWITTER]
            </a>
            <a href="#" className="text-muted-foreground hover:text-accent transition-colors">
              [DOCS]
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}

function Landing() {
  return (
    <>
      {/* Hero - Dramatic full-viewport */}
      <section className="min-h-screen relative flex items-center overflow-hidden">
        <DissolveParticles />
        <DataStream />

        {/* Gradient orbs */}
        <div className="absolute top-1/4 -right-32 w-64 md:w-96 h-64 md:h-96 bg-accent/10 rounded-full blur-[120px] pointer-events-none" />
        <div className="absolute bottom-1/4 -left-32 w-48 md:w-64 h-48 md:h-64 bg-[var(--accent-secondary)]/10 rounded-full blur-[100px] pointer-events-none" />

        <div className="relative z-10 w-full max-w-7xl mx-auto px-4 sm:px-6 pt-24 sm:pt-32 pb-20 sm:pb-24">
          <div className="flex flex-col xl:flex-row xl:items-center gap-12 xl:gap-16">
            {/* Left: Main content */}
            <div className="flex-1 space-y-8 sm:space-y-12">
              {/* Status badge */}
              <div className="animate-in-delayed-1">
                <div className="inline-flex items-center gap-2 sm:gap-3 px-3 sm:px-4 py-2 border border-border bg-background/50 backdrop-blur">
                  <span className="w-2 h-2 rounded-full bg-success animate-pulse" />
                  <span className="text-mono text-[10px] sm:text-xs text-muted-foreground">
                    PROTOCOL ACTIVE
                  </span>
                  <span className="text-muted-foreground/30 hidden sm:inline">|</span>
                  <span className="text-mono text-[10px] sm:text-xs text-accent hidden sm:inline">
                    ZERO-KNOWLEDGE
                  </span>
                </div>
              </div>

              {/* Main headline */}
              <div className="space-y-2 animate-in-delayed-2">
                <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-extrabold uppercase tracking-tight leading-[0.9]" style={{ fontFamily: 'var(--font-syne), system-ui, sans-serif' }}>
                  <span className="block text-foreground">TRADE</span>
                  <span className="block gradient-text">INVISIBLE</span>
                </h1>
              </div>

              {/* Description */}
              <div className="max-w-xl space-y-6 animate-in-delayed-3">
                <p className="text-base sm:text-lg text-muted-foreground leading-relaxed">
                  Privacy-preserving dollar cost averaging on Solana.
                  Your positions, timing, and flow remain cryptographically
                  unlinkable. Accumulate without leaving a trace.
                </p>

                {/* CTA */}
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:gap-4">
                  <a href="#protocol" className="btn btn-primary text-center">
                    ENTER PROTOCOL
                  </a>
                  <a href="#how" className="btn btn-ghost text-center">
                    HOW IT WORKS
                  </a>
                </div>
              </div>

              {/* Stats row */}
              <div className="flex items-center gap-6 sm:gap-12 pt-6 sm:pt-8 border-t border-border/50 animate-in-delayed-4">
                <Stat label="TVL" value="$2.4M" />
                <Stat label="TRADES" value="12,847" />
                <Stat label="USERS" value="1,203" />
              </div>
            </div>

            {/* Right: ASCII art + visual */}
            <div className="hidden xl:flex flex-col items-center justify-center w-[380px] flex-shrink-0">
              <div className="animate-float">
                <AsciiLogo />
              </div>
              <div className="mt-8 w-full max-w-sm">
                <TerminalBox />
              </div>
            </div>
          </div>
        </div>

        {/* Scroll indicator */}
        <div className="absolute bottom-6 sm:bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 animate-bounce">
          <span className="text-mono text-[10px] sm:text-xs text-muted-foreground">SCROLL</span>
          <div className="w-px h-6 sm:h-8 bg-gradient-to-b from-muted-foreground to-transparent" />
        </div>
      </section>

      {/* How it works */}
      <section id="how" className="section relative border-t border-border/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="flex flex-col lg:flex-row gap-8 lg:gap-16">
            {/* Section header */}
            <div className="lg:w-1/3 flex-shrink-0">
              <span className="text-label text-accent">// PROTOCOL</span>
              <h2 className="text-headline mt-4 mb-6">
                THREE STEPS TO<br />
                <span className="gradient-text">INVISIBILITY</span>
              </h2>
              <div className="line-accent" />
            </div>

            {/* Steps */}
            <div className="lg:flex-1">
              <div className="space-y-0">
                <Step
                  number="01"
                  title="SHIELD"
                  description="Deposit assets into the privacy pool. Your balance becomes an encrypted commitment—origin address is now unlinkable."
                  command="cloak deposit --amount 100 --token SOL"
                />
                <Step
                  number="02"
                  title="CONFIGURE"
                  description="Define your DCA strategy: target asset, amount per execution, frequency. Sign once to authorize all future trades."
                  command="cloak dca --target BONK --per-trade 10 --freq 1h"
                />
                <Step
                  number="03"
                  title="EXECUTE"
                  description="Trades execute automatically on schedule. Each swap routes through the pool—your wallet never touches the DEX."
                  command="cloak status --watch"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Privacy model */}
      <section id="protocol" className="section relative border-t border-border/50">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-px h-16 sm:h-24 bg-gradient-to-b from-accent/50 to-transparent" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-10 sm:mb-16">
            <span className="text-label text-accent">// CRYPTOGRAPHY</span>
            <h2 className="text-headline mt-4">
              MATHEMATICS,<br />
              <span className="text-muted-foreground">NOT TRUST</span>
            </h2>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            <FeatureCard
              icon="◈"
              title="SHIELDED POOL"
              description="UTXO-based privacy pool with encrypted commitments. Deposits and withdrawals reveal nothing about origin or destination."
            />
            <FeatureCard
              icon="⬡"
              title="SESSION KEYS"
              description="Deterministic keypairs derived from your signature authorize trades without exposing your primary wallet identity."
            />
            <FeatureCard
              icon="◇"
              title="JUPITER ROUTING"
              description="Best-price execution across all Solana DEXs. MEV protection built-in. Your trades blend with millions of others."
            />
          </div>

          {/* Technical specs */}
          <div className="mt-10 sm:mt-16 p-4 sm:p-6 border border-border/50 bg-background/50 backdrop-blur">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 sm:gap-8">
              <TechSpec label="PROOF SYSTEM" value="GROTH16" />
              <TechSpec label="ANONYMITY SET" value=">10,000" />
              <TechSpec label="FINALITY" value="<400ms" />
              <TechSpec label="AUDIT STATUS" value="PENDING" />
            </div>
          </div>
        </div>
      </section>

      {/* CTA section */}
      <section className="section border-t border-border/50 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-t from-accent/5 to-transparent pointer-events-none" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 text-center relative z-10">
          <h2 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-extrabold uppercase tracking-tight leading-[0.9] mb-6 sm:mb-8" style={{ fontFamily: 'var(--font-syne), system-ui, sans-serif' }}>
            <span className="text-foreground">START</span><br />
            <span className="gradient-text">ACCUMULATING</span>
          </h2>
          <p className="text-base sm:text-lg text-muted-foreground max-w-xl mx-auto mb-8 sm:mb-12">
            Connect your wallet to begin. Your first deposit enters the privacy pool immediately.
          </p>
          <div className="flex justify-center">
            <WalletButton />
          </div>
        </div>
      </section>
    </>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="space-y-1">
      <span className="text-label text-[9px] sm:text-[10px]">{label}</span>
      <p className="text-xl sm:text-2xl font-mono gradient-text">{value}</p>
    </div>
  );
}

function Step({ number, title, description, command }: {
  number: string;
  title: string;
  description: string;
  command: string;
}) {
  return (
    <div className="group py-6 sm:py-8 border-b border-border/50 hover:border-accent/30 transition-colors">
      <div className="flex items-start gap-4 sm:gap-8">
        <span className="text-mono text-accent/50 group-hover:text-accent transition-colors text-sm sm:text-base">
          {number}
        </span>
        <div className="flex-1 space-y-3 sm:space-y-4 min-w-0">
          <h3 className="text-title text-lg sm:text-xl group-hover:text-accent transition-colors">
            <ScrambleText text={title} />
          </h3>
          <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
            {description}
          </p>
          <div className="inline-flex items-center gap-2 px-2 sm:px-3 py-1.5 sm:py-2 bg-muted/50 border border-border/50 overflow-x-auto max-w-full">
            <span className="text-accent text-xs flex-shrink-0">$</span>
            <code className="text-mono text-[10px] sm:text-xs text-muted-foreground whitespace-nowrap">{command}</code>
          </div>
        </div>
      </div>
    </div>
  );
}

function FeatureCard({ icon, title, description }: {
  icon: string;
  title: string;
  description: string;
}) {
  return (
    <div className="group p-6 border border-border/50 bg-background/30 backdrop-blur hover:border-accent/30 hover:bg-accent/5 transition-all">
      <div className="text-3xl text-accent mb-4 group-hover:scale-110 transition-transform inline-block">
        {icon}
      </div>
      <h3 className="text-title mb-3">{title}</h3>
      <p className="text-sm text-muted-foreground leading-relaxed">
        {description}
      </p>
    </div>
  );
}

function TechSpec({ label, value }: { label: string; value: string }) {
  return (
    <div className="text-center">
      <span className="text-label block mb-2">{label}</span>
      <span className="text-mono text-lg text-foreground">{value}</span>
    </div>
  );
}

function TerminalBox() {
  const [lines, setLines] = useState<string[]>([]);

  useEffect(() => {
    const commands = [
      '> initializing cloak protocol...',
      '> connecting to solana mainnet...',
      '> privacy pool: ACTIVE',
      '> anonymity set: 10,247 users',
      '> ready for deposits',
    ];

    let currentIndex = 0;
    const interval = setInterval(() => {
      if (currentIndex < commands.length) {
        const cmd = commands[currentIndex];
        setLines(prev => [...prev, cmd]);
        currentIndex++;
      } else {
        clearInterval(interval);
      }
    }, 800);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="border border-border/50 bg-background/80 backdrop-blur p-4">
      <div className="flex items-center gap-2 mb-4 pb-4 border-b border-border/50">
        <div className="w-3 h-3 rounded-full bg-destructive/50" />
        <div className="w-3 h-3 rounded-full bg-accent/50" />
        <div className="w-3 h-3 rounded-full bg-success/50" />
        <span className="text-mono text-xs text-muted-foreground ml-2">terminal</span>
      </div>
      <div className="space-y-2 min-h-[140px]">
        {lines.map((line, idx) => (
          <div key={idx} className="text-mono text-xs">
            <span className={line && (line.includes('ACTIVE') || line.includes('ready')) ? 'text-success' : 'text-muted-foreground'}>
              {line}
            </span>
          </div>
        ))}
        {lines.length === 5 && (
          <div className="text-mono text-xs text-accent terminal-cursor">_</div>
        )}
      </div>
    </div>
  );
}
