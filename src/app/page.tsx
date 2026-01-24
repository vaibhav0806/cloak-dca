'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { WalletButton } from '@/components/wallet/WalletButton';
import { Dashboard } from '@/components/dashboard/Dashboard';
import { useWallet } from '@solana/wallet-adapter-react';
import { ArrowRight, Shield, Zap, Lock } from 'lucide-react';

// 3D Particle Globe - rotating sphere of glowing particles
function PrivacyGlobe() {
  // Generate particles on a sphere surface
  const particles = useMemo(() => {
    const points: Array<{ id: number; lat: number; lng: number; size: number; delay: number }> = [];
    const latitudes = [-60, -40, -20, 0, 20, 40, 60];
    let id = 0;

    latitudes.forEach((lat, latIdx) => {
      // More particles near equator, fewer at poles
      const particlesAtLat = Math.floor(12 * Math.cos((lat * Math.PI) / 180));
      for (let i = 0; i < particlesAtLat; i++) {
        const lng = (360 / particlesAtLat) * i + (latIdx % 2) * 15; // offset alternating rows
        points.push({
          id: id++,
          lat,
          lng,
          size: 2 + Math.random() * 2,
          delay: Math.random() * 4,
        });
      }
    });

    // Add polar particles
    points.push({ id: id++, lat: 85, lng: 0, size: 3, delay: 0 });
    points.push({ id: id++, lat: -85, lng: 0, size: 3, delay: 2 });

    return points;
  }, []);

  // Connection lines between nearby particles
  const connections = useMemo(() => {
    const lines: Array<{ id: string; lat1: number; lng1: number; lat2: number; lng2: number }> = [];
    for (let i = 0; i < particles.length; i++) {
      for (let j = i + 1; j < particles.length; j++) {
        const p1 = particles[i];
        const p2 = particles[j];
        const latDiff = Math.abs(p1.lat - p2.lat);
        const lngDiff = Math.min(Math.abs(p1.lng - p2.lng), 360 - Math.abs(p1.lng - p2.lng));
        // Connect if close enough
        if (latDiff <= 25 && lngDiff <= 40) {
          lines.push({
            id: `${p1.id}-${p2.id}`,
            lat1: p1.lat,
            lng1: p1.lng,
            lat2: p2.lat,
            lng2: p2.lng,
          });
        }
      }
    }
    return lines.slice(0, 60); // Limit connections
  }, [particles]);

  const radius = 140;

  return (
    <div className="relative w-full h-full flex items-center justify-center">
      {/* Ambient glow */}
      <div className="absolute w-72 h-72 rounded-full bg-accent/10 blur-3xl" />
      <div className="absolute w-48 h-48 rounded-full bg-accent/20 blur-2xl animate-pulse" />

      {/* 3D Scene container */}
      <div
        className="globe-container"
        style={{
          width: radius * 2,
          height: radius * 2,
          perspective: '800px',
        }}
      >
        {/* Rotating sphere */}
        <div
          className="globe-sphere"
          style={{
            width: '100%',
            height: '100%',
            transformStyle: 'preserve-3d',
            animation: 'globeRotate 20s linear infinite',
          }}
        >
          {/* Particles */}
          {particles.map((p) => {
            const latRad = (p.lat * Math.PI) / 180;
            const lngRad = (p.lng * Math.PI) / 180;
            const x = radius * Math.cos(latRad) * Math.sin(lngRad);
            const y = radius * Math.sin(latRad);
            const z = radius * Math.cos(latRad) * Math.cos(lngRad);

            return (
              <div
                key={p.id}
                className="globe-particle"
                style={{
                  width: p.size,
                  height: p.size,
                  transform: `translate3d(${x + radius - p.size / 2}px, ${-y + radius - p.size / 2}px, ${z}px)`,
                  animationDelay: `${p.delay}s`,
                }}
              />
            );
          })}

          {/* Connection lines */}
          {connections.map((c) => {
            const lat1Rad = (c.lat1 * Math.PI) / 180;
            const lng1Rad = (c.lng1 * Math.PI) / 180;
            const lat2Rad = (c.lat2 * Math.PI) / 180;
            const lng2Rad = (c.lng2 * Math.PI) / 180;

            const x1 = radius * Math.cos(lat1Rad) * Math.sin(lng1Rad) + radius;
            const y1 = -radius * Math.sin(lat1Rad) + radius;
            const z1 = radius * Math.cos(lat1Rad) * Math.cos(lng1Rad);
            const x2 = radius * Math.cos(lat2Rad) * Math.sin(lng2Rad) + radius;
            const y2 = -radius * Math.sin(lat2Rad) + radius;
            const z2 = radius * Math.cos(lat2Rad) * Math.cos(lng2Rad);

            const length = Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);
            const angle = Math.atan2(y2 - y1, x2 - x1) * (180 / Math.PI);
            const midZ = (z1 + z2) / 2;

            return (
              <div
                key={c.id}
                className="globe-connection"
                style={{
                  width: length,
                  left: x1,
                  top: y1,
                  transform: `rotate(${angle}deg) translateZ(${midZ}px)`,
                  transformOrigin: '0 0',
                }}
              />
            );
          })}
        </div>
      </div>

      {/* Center emblem */}
      <div className="absolute flex items-center justify-center pointer-events-none">
        <div className="w-16 h-16 rounded-full bg-background/80 backdrop-blur-sm border border-accent/30 flex items-center justify-center shadow-[0_0_40px_rgba(255,99,71,0.3)]">
          <Shield className="h-7 w-7 text-accent" />
        </div>
      </div>
    </div>
  );
}

export default function Home() {
  const { connected, connecting } = useWallet();

  // Simple hydration check - becomes true after first client render
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  // Before hydration, render minimal shell to avoid mismatch
  if (!mounted) {
    return (
      <div className="min-h-screen bg-background" />
    );
  }

  // While actively connecting, show spinner
  if (connecting) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <Header showNav={false} />
        <main className="flex-1 flex items-center justify-center">
          <div className="h-6 w-6 border-2 border-accent border-t-transparent rounded-full animate-spin" />
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Header showNav={!connected} />
      <main className="flex-1">
        {!connected ? <Landing /> : <Dashboard />}
      </main>
      {!connected && <Footer />}
    </div>
  );
}

function Header({ showNav = true }: { showNav?: boolean }) {
  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-md border-b border-border">
      <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
        <div className="flex items-center gap-12">
          <Link href="/" className="text-xl font-semibold tracking-tight">
            cloak<span className="accent">.</span>
          </Link>
          {showNav && (
            <nav className="hidden md:flex items-center gap-8">
              <a href="#how" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                How it works
              </a>
              <a href="#privacy" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                Privacy
              </a>
            </nav>
          )}
        </div>
        <WalletButton />
      </div>
    </header>
  );
}

function Footer() {
  return (
    <footer className="border-t border-border">
      <div className="max-w-6xl mx-auto px-6 py-8 flex items-center justify-between">
        <span className="text-sm text-muted-foreground">
          cloak<span className="accent">.</span> — private dca
        </span>
        <div className="flex items-center gap-6 text-sm text-muted-foreground">
          <a href="https://github.com" target="_blank" rel="noopener" className="hover:text-foreground transition-colors">
            GitHub
          </a>
          <a href="https://twitter.com" target="_blank" rel="noopener" className="hover:text-foreground transition-colors">
            Twitter
          </a>
        </div>
      </div>
    </footer>
  );
}

function Landing() {
  return (
    <>
      {/* Hero */}
      <section className="pt-32 pb-24 md:pt-44 md:pb-32 overflow-hidden">
        <div className="max-w-6xl mx-auto px-6">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            {/* Left: Text */}
            <div>
              <p className="text-label accent mb-6">Zero-Knowledge DCA on Solana</p>
              <h1 className="text-display mb-8">
                Accumulate<br />
                <span className="accent">invisibly.</span>
              </h1>
              <p className="text-xl text-muted-foreground leading-relaxed mb-12 max-w-xl">
                Dollar-cost average through privacy pools. Your positions, timing, and flow are cryptographically unlinkable.
              </p>
              <a href="#how" className="group inline-flex items-center gap-2 text-foreground hover:text-accent transition-colors font-medium">
                See how it works
                <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
              </a>
            </div>

            {/* Right: 3D Globe visualization */}
            <div className="relative h-[380px] md:h-[420px] hidden md:flex items-center justify-center">
              <PrivacyGlobe />
            </div>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how" className="section">
        <div className="max-w-6xl mx-auto px-6">
          <p className="text-label accent mb-4">How it works</p>
          <h2 className="text-headline mb-16 max-w-md">
            Three steps to invisible accumulation.
          </h2>

          <div className="grid md:grid-cols-3 gap-12 md:gap-8">
            <Step
              number="01"
              title="Shield"
              description="Deposit assets into the privacy pool. You receive an encrypted commitment—your balance is now unlinkable."
            />
            <Step
              number="02"
              title="Configure"
              description="Set your target asset, amount per trade, and frequency. Sign once to authorize all future executions."
            />
            <Step
              number="03"
              title="Execute"
              description="Trades execute automatically on schedule. Each swap is routed through the pool—origin never exposed."
            />
          </div>
        </div>
      </section>

      {/* Privacy */}
      <section id="privacy" className="section border-t border-border">
        <div className="max-w-6xl mx-auto px-6">
          <div className="grid md:grid-cols-2 gap-16 items-start">
            <div>
              <p className="text-label accent mb-4">Privacy Model</p>
              <h2 className="text-headline mb-6">
                Mathematics, not trust.
              </h2>
              <p className="text-muted-foreground leading-relaxed">
                Cloak uses zero-knowledge proofs to validate transactions without revealing
                inputs, outputs, or links between them. Your on-chain footprint is
                indistinguishable from any other pool participant.
              </p>
            </div>

            <div className="space-y-6">
              <Feature
                icon={<Shield className="h-5 w-5" />}
                title="Shielded Pool"
                description="UTXO-based privacy pool with encrypted commitments. Deposits and withdrawals reveal nothing."
              />
              <Feature
                icon={<Lock className="h-5 w-5" />}
                title="Session Keys"
                description="Deterministic keypairs authorize trades without exposing your primary wallet."
              />
              <Feature
                icon={<Zap className="h-5 w-5" />}
                title="Jupiter Routing"
                description="Best-price execution across Solana DEXs with MEV protection built in."
              />
            </div>
          </div>
        </div>
      </section>

    </>
  );
}

function Step({ number, title, description }: { number: string; title: string; description: string }) {
  return (
    <div className="group">
      <p className="text-mono text-muted-foreground mb-4">{number}</p>
      <h3 className="text-title mb-3 group-hover:text-accent transition-colors">{title}</h3>
      <p className="text-sm text-muted-foreground leading-relaxed">{description}</p>
    </div>
  );
}

function Feature({ icon, title, description }: { icon: React.ReactNode; title: string; description: string }) {
  return (
    <div className="flex gap-4 p-4 rounded-lg border border-border hover:border-accent/50 transition-colors">
      <div className="text-accent mt-0.5">{icon}</div>
      <div>
        <h4 className="text-title mb-1">{title}</h4>
        <p className="text-sm text-muted-foreground leading-relaxed">{description}</p>
      </div>
    </div>
  );
}

