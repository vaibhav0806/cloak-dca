'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { WalletButton } from '@/components/wallet/WalletButton';
import { Dashboard } from '@/components/dashboard/Dashboard';
import { useWallet } from '@solana/wallet-adapter-react';
import { Eye, EyeOff, Check, ArrowRight, Shield } from 'lucide-react';

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
          <div className="flex flex-col items-center gap-4">
            <div className="relative">
              <div className="h-10 w-10 rounded-full border-2 border-muted" />
              <div className="absolute inset-0 h-10 w-10 rounded-full border-2 border-transparent border-t-accent animate-spin" />
            </div>
            <p className="text-sm text-muted-foreground">Connecting wallet...</p>
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
  const { connected } = useWallet();
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <header className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
      scrolled ? 'bg-background/90 backdrop-blur-xl border-b border-border' : 'bg-transparent'
    }`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 sm:h-20 flex items-center justify-between">
        <Link href="/" className="flex items-center">
          <span className="text-xl sm:text-2xl font-semibold tracking-tight">
            cloak<span className="text-accent">.</span>
          </span>
        </Link>

        {!connected && (
          <nav className="hidden md:flex items-center gap-1">
            <a href="#how-it-works" className="px-4 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors rounded-lg hover:bg-white/5">
              How it works
            </a>
            <a href="#security" className="px-4 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors rounded-lg hover:bg-white/5">
              Security
            </a>
          </nav>
        )}

        <WalletButton />
      </div>
    </header>
  );
}

function Footer() {
  return (
    <footer className="border-t border-border bg-card/30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold tracking-tight">
            cloak<span className="text-accent">.</span>
          </span>
          <span className="text-sm text-muted-foreground">— private dca on solana</span>
        </div>
        <div className="flex items-center gap-6 text-sm text-muted-foreground">
          <a href="#" className="hover:text-foreground transition-colors">GitHub</a>
          <a href="#" className="hover:text-foreground transition-colors">Twitter</a>
        </div>
      </div>
    </footer>
  );
}

function Landing() {
  return (
    <div className="relative overflow-hidden">
      {/* Background effects */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        {/* Main gradient glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] sm:w-[1200px] h-[600px] sm:h-[800px] bg-gradient-radial from-accent/[0.08] via-accent/[0.02] to-transparent rounded-full blur-3xl" />

        {/* Animated floating orbs */}
        <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-accent/5 rounded-full blur-3xl animate-float-slow" />
        <div className="absolute top-1/3 right-1/4 w-48 h-48 bg-accent/3 rounded-full blur-3xl animate-float-slower" />
        <div className="absolute bottom-1/4 left-1/3 w-32 h-32 bg-accent/5 rounded-full blur-2xl animate-float" />

        {/* Subtle grid */}
        <div
          className="absolute inset-0 opacity-[0.015]"
          style={{
            backgroundImage: `linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)`,
            backgroundSize: '60px 60px',
          }}
        />
      </div>

      {/* Hero */}
      <section className="relative min-h-[100svh] flex items-center pt-20 sm:pt-0">
        {/* Animated orbital rings - centered behind content */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none overflow-hidden">
          {/* Outermost ring */}
          <div className="absolute w-[700px] h-[700px] sm:w-[900px] sm:h-[900px] rounded-full border border-accent/[0.05] animate-[spin_80s_linear_infinite]">
            <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-accent/25" />
            <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 w-1 h-1 rounded-full bg-accent/15" />
            <div className="absolute top-1/2 right-0 translate-x-1/2 -translate-y-1/2 w-1 h-1 rounded-full bg-accent/20" />
            <div className="absolute top-[15%] right-[15%] w-1 h-1 rounded-full bg-accent/15" />
          </div>
          {/* Outer ring */}
          <div className="absolute w-[550px] h-[550px] sm:w-[750px] sm:h-[750px] rounded-full border border-accent/[0.07] animate-[spin_60s_linear_infinite_reverse]">
            <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-accent/35" />
            <div className="absolute top-1/2 left-0 -translate-x-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-accent/25" />
            <div className="absolute bottom-[20%] right-[10%] w-1 h-1 rounded-full bg-accent/20" />
            <div className="absolute top-[25%] left-[15%] w-1 h-1 rounded-full bg-accent/15" />
          </div>
          {/* Middle outer ring */}
          <div className="absolute w-[420px] h-[420px] sm:w-[600px] sm:h-[600px] rounded-full border border-accent/[0.06] animate-[spin_50s_linear_infinite]">
            <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 w-1.5 h-1.5 rounded-full bg-accent/30" />
            <div className="absolute top-[30%] right-0 translate-x-1/2 w-1 h-1 rounded-full bg-accent/25" />
            <div className="absolute bottom-[25%] left-[5%] w-1 h-1 rounded-full bg-accent/20" />
          </div>
          {/* Middle ring */}
          <div className="absolute w-[320px] h-[320px] sm:w-[480px] sm:h-[480px] rounded-full border border-accent/[0.08] animate-[spin_40s_linear_infinite_reverse]">
            <div className="absolute top-1/2 right-0 translate-x-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-accent/35" />
            <div className="absolute top-1/2 left-0 -translate-x-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-accent/25" />
            <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 w-1 h-1 rounded-full bg-accent/30" />
            <div className="absolute bottom-[15%] right-[20%] w-1 h-1 rounded-full bg-accent/20" />
          </div>
          {/* Inner middle ring */}
          <div className="absolute w-[240px] h-[240px] sm:w-[360px] sm:h-[360px] rounded-full border border-accent/[0.07] animate-[spin_35s_linear_infinite]">
            <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-accent/40" />
            <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 w-1 h-1 rounded-full bg-accent/30" />
            <div className="absolute top-1/2 right-0 translate-x-1/2 -translate-y-1/2 w-1 h-1 rounded-full bg-accent/25" />
          </div>
          {/* Inner ring */}
          <div className="absolute w-[160px] h-[160px] sm:w-[250px] sm:h-[250px] rounded-full border border-accent/[0.1] animate-[spin_25s_linear_infinite_reverse]">
            <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 w-2 h-2 rounded-full bg-accent/45" />
            <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 w-1 h-1 rounded-full bg-accent/35" />
            <div className="absolute top-1/2 left-0 -translate-x-1/2 -translate-y-1/2 w-1 h-1 rounded-full bg-accent/30" />
          </div>
          {/* Core ring */}
          <div className="absolute w-[100px] h-[100px] sm:w-[150px] sm:h-[150px] rounded-full border border-accent/[0.12] animate-[spin_20s_linear_infinite]">
            <div className="absolute top-1/2 right-0 translate-x-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-accent/50" />
            <div className="absolute top-1/2 left-0 -translate-x-1/2 -translate-y-1/2 w-1 h-1 rounded-full bg-accent/40" />
          </div>
          {/* Center glow */}
          <div className="absolute w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-accent/[0.08] blur-xl animate-pulse" />
          <div className="absolute w-8 h-8 sm:w-12 sm:h-12 rounded-full bg-accent/[0.15] blur-md" />
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-20 w-full relative z-10">
          <div className="max-w-4xl mx-auto text-center">
            {/* Minimal badge - just "on Solana" */}
            <div
              className="inline-flex items-center gap-2 mb-8 sm:mb-10"
              style={{ animation: 'fadeSlideUp 0.7s ease-out forwards', opacity: 0 }}
            >
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-xs sm:text-sm text-muted-foreground/70">Live on Solana</span>
            </div>

            {/* Headline */}
            <h1
              className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-medium leading-[1.1] tracking-tight mb-6 sm:mb-8"
              style={{ animation: 'fadeSlideUp 0.7s ease-out 0.1s forwards', opacity: 0 }}
            >
              The private way to
              <br />
              <span className="text-accent">accumulate crypto</span>
            </h1>

            {/* Subheadline */}
            <p
              className="text-base sm:text-lg md:text-xl text-muted-foreground leading-relaxed mb-10 sm:mb-12 max-w-2xl mx-auto px-4"
              style={{ animation: 'fadeSlideUp 0.7s ease-out 0.2s forwards', opacity: 0 }}
            >
              Dollar-cost average on Solana without exposing your strategy.
              Your trades, timing, and positions remain completely private.
            </p>

            {/* Trust indicators - minimal */}
            <div
              className="flex items-center justify-center gap-3 text-xs sm:text-sm text-muted-foreground/50"
              style={{ animation: 'fadeSlideUp 0.7s ease-out 0.3s forwards', opacity: 0 }}
            >
              <span>Self-custody</span>
              <span className="w-1 h-1 rounded-full bg-accent/50" />
              <span>Automated</span>
              <span className="w-1 h-1 rounded-full bg-accent/50" />
              <span>Private</span>
            </div>
          </div>
        </div>

        {/* Scroll hint */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 hidden sm:flex flex-col items-center gap-2">
          <span className="text-xs text-muted-foreground/50">Scroll to explore</span>
          <div className="w-px h-8 bg-gradient-to-b from-muted-foreground/30 to-transparent" />
        </div>
      </section>

      {/* Problem vs Solution - Side by Side */}
      <ComparisonSection />

      {/* How it works */}
      <section id="how-it-works" className="relative py-16 sm:py-24 lg:py-32 border-t border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12 sm:mb-16 lg:mb-20">
            <p className="text-accent text-sm font-medium mb-4">How it works</p>
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-medium">
              Three steps to private accumulation
            </h2>
          </div>

          <div className="grid md:grid-cols-3 gap-6 sm:gap-8">
            <ProcessStep
              number="01"
              title="Deposit"
              description="Transfer USDC to your shielded balance. Your deposit becomes an encrypted commitment—the link to your wallet is cryptographically severed."
            />
            <ProcessStep
              number="02"
              title="Configure"
              description="Set your strategy: target token, amount per trade, frequency. Sign once to authorize the protocol to execute on your behalf."
            />
            <ProcessStep
              number="03"
              title="Accumulate"
              description="Trades execute automatically through the privacy pool. Your wallet never interacts with DEXs—complete anonymity, best prices."
            />
          </div>
        </div>
      </section>

      {/* Security */}
      <section id="security" className="relative py-16 sm:py-24 lg:py-32 bg-card/30 border-t border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-20">
            <div>
              <p className="text-accent text-sm font-medium mb-4">Security</p>
              <h2 className="text-2xl sm:text-3xl md:text-4xl font-medium leading-tight mb-6">
                Built for the security-conscious
              </h2>
              <p className="text-muted-foreground leading-relaxed mb-8 sm:mb-10">
                <span className="text-foreground">cloak</span><span className="text-accent">.</span> is designed from the ground up with security as the top priority.
                Your funds remain in your control at all times.
              </p>

              <div className="space-y-6">
                <SecurityFeature
                  title="You keep your keys"
                  description="We can't access your funds. Your wallet signs everything — we just facilitate the trades."
                />
                <SecurityFeature
                  title="Sign once, trade automatically"
                  description="One signature creates a trading session. Your main wallet stays untouched while DCA runs."
                />
                <SecurityFeature
                  title="Mathematically private"
                  description="The protocol proves your trade is valid without revealing who you are or what you're trading."
                />
              </div>
            </div>

            {/* Visual element */}
            <div className="hidden lg:flex items-center justify-center">
              <div className="relative">
                {/* Glow */}
                <div className="absolute inset-0 bg-accent/20 rounded-full blur-3xl scale-150" />

                {/* Shield icon */}
                <div className="relative w-48 h-48 rounded-full border border-accent/20 bg-card/50 flex items-center justify-center">
                  <div className="w-32 h-32 rounded-full border border-accent/30 bg-accent/5 flex items-center justify-center">
                    <Shield className="w-16 h-16 text-accent/80" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

    </div>
  );
}

// Component helpers
function ProcessStep({ number, title, description }: {
  number: string;
  title: string;
  description: string;
  icon?: React.ReactNode;
}) {
  return (
    <div className="group relative p-6 sm:p-8 rounded-2xl border border-border bg-card/50 hover:bg-card hover:border-accent/20 transition-all duration-300">
      <div className="mb-6 sm:mb-8">
        <span className="text-5xl sm:text-6xl font-extralight text-muted-foreground/20 group-hover:text-accent/30 transition-colors">{number}</span>
      </div>
      <h3 className="text-lg sm:text-xl font-medium mb-2 sm:mb-3">{title}</h3>
      <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">{description}</p>
    </div>
  );
}

function SecurityFeature({ title, description }: { title: string; description: string }) {
  return (
    <div className="flex gap-4">
      <div className="mt-1">
        <div className="w-5 h-5 rounded-full border-2 border-accent flex items-center justify-center">
          <Check className="h-3 w-3 text-accent" />
        </div>
      </div>
      <div>
        <h4 className="font-medium mb-1">{title}</h4>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
    </div>
  );
}

function ComparisonSection() {
  const [isVisible, setIsVisible] = useState(false);
  const sectionRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
        }
      },
      { threshold: 0.2 }
    );

    if (sectionRef.current) {
      observer.observe(sectionRef.current);
    }

    return () => observer.disconnect();
  }, []);

  return (
    <section ref={sectionRef} className="relative py-16 sm:py-24 lg:py-32 border-t border-border overflow-hidden">
      {/* Subtle background */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-card/30 to-transparent pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
        {/* Section header */}
        <div className={`text-center mb-12 sm:mb-16 transition-all duration-700 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
          <p className="text-accent text-sm font-medium mb-4">Why privacy matters</p>
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-medium">
            See the difference cloak<span className="text-accent">.</span> makes
          </h2>
        </div>

        {/* Side by side comparison */}
        <div className="grid lg:grid-cols-2 gap-4 lg:gap-6 relative">
          {/* Center arrow - desktop */}
          <div className={`hidden lg:flex absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-10 transition-all duration-500 delay-500 ${isVisible ? 'opacity-100 scale-100' : 'opacity-0 scale-50'}`}>
            <div className="w-12 h-12 rounded-full bg-background border-2 border-emerald-500/50 flex items-center justify-center shadow-[0_0_20px_rgba(16,185,129,0.25)]">
              <ArrowRight className="w-5 h-5 text-emerald-400" />
            </div>
          </div>

          {/* Problem - Left side (Bad - exposed, vulnerable) */}
          <div className={`transition-all duration-700 delay-100 ${isVisible ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-8'}`}>
            <div className="h-full p-6 sm:p-8 rounded-2xl bg-zinc-900/50 border border-dashed border-zinc-700/50 relative overflow-hidden">
              {/* Subtle danger gradient overlay */}
              <div className="absolute inset-0 bg-gradient-to-br from-red-950/20 to-transparent pointer-events-none" />

              <div className="relative">
                <div className="flex items-center gap-3 mb-5">
                  <div className="w-11 h-11 rounded-xl bg-zinc-800 border border-zinc-700/50 flex items-center justify-center">
                    <Eye className="w-5 h-5 text-zinc-500" />
                  </div>
                  <div>
                    <p className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider">Without privacy</p>
                    <p className="text-lg font-medium text-zinc-300">Public by default</p>
                  </div>
                </div>

                <p className="text-zinc-500 text-sm leading-relaxed mb-6">
                  Every trade you make on-chain is visible. Watchers can see your patterns and front-run your orders.
                </p>

                <div className="space-y-3">
                  {['Wallet balances exposed', 'DCA timing visible to bots', 'Full history trackable'].map((text, i) => (
                    <div
                      key={text}
                      className={`flex items-center gap-3 transition-all duration-500 ${isVisible ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-4'}`}
                      style={{ transitionDelay: `${300 + i * 100}ms` }}
                    >
                      <div className="w-4 h-4 rounded-full border border-red-500/30 flex items-center justify-center shrink-0">
                        <div className="w-1.5 h-1.5 rounded-full bg-red-500/50" />
                      </div>
                      <p className="text-zinc-500 text-sm">{text}</p>
                    </div>
                  ))}
                </div>

                <div className="mt-6 pt-5 border-t border-zinc-800">
                  <div className="flex items-center gap-2 text-sm text-red-400/60">
                    <Eye className="w-4 h-4" />
                    <span>Anyone can watch your moves</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Solution - Right side (Good - protected, premium) */}
          <div className={`transition-all duration-700 delay-300 ${isVisible ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-8'}`}>
            <div className="h-full p-6 sm:p-8 rounded-2xl bg-gradient-to-br from-emerald-950/30 to-emerald-950/5 border border-emerald-500/25 relative overflow-hidden shadow-[0_0_40px_-10px_rgba(16,185,129,0.15)]">
              {/* Subtle glow effect */}
              <div className="absolute -top-20 -right-20 w-40 h-40 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

              <div className="relative">
                <div className="flex items-center gap-3 mb-5">
                  <div className="w-11 h-11 rounded-xl bg-emerald-500/15 border border-emerald-500/20 flex items-center justify-center">
                    <EyeOff className="w-5 h-5 text-emerald-400" />
                  </div>
                  <div>
                    <p className="text-[11px] font-semibold text-emerald-400 uppercase tracking-wider">With cloak</p>
                    <p className="text-lg font-medium">Invisible by design</p>
                  </div>
                </div>

                <p className="text-muted-foreground text-sm leading-relaxed mb-6">
                  Zero-knowledge proofs break the link between your wallet and trades. No one can trace your activity.
                </p>

                <div className="space-y-3">
                  {['Shielded balances', 'Private execution', 'Unlinkable transactions'].map((text, i) => (
                    <div
                      key={text}
                      className={`flex items-center gap-3 transition-all duration-500 ${isVisible ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-4'}`}
                      style={{ transitionDelay: `${500 + i * 100}ms` }}
                    >
                      <div className="w-4 h-4 rounded-full bg-emerald-500/20 flex items-center justify-center shrink-0">
                        <Check className="w-3 h-3 text-emerald-400" />
                      </div>
                      <p className="text-foreground text-sm">{text}</p>
                    </div>
                  ))}
                </div>

                <div className="mt-6 pt-5 border-t border-emerald-500/15">
                  <div className="flex items-center gap-2 text-sm text-emerald-400">
                    <EyeOff className="w-4 h-4" />
                    <span>Your identity stays private</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Mobile arrow */}
        <div className={`lg:hidden flex justify-center my-4 transition-all duration-500 delay-200 ${isVisible ? 'opacity-100' : 'opacity-0'}`}>
          <div className="w-10 h-10 rounded-full bg-background border border-emerald-500/50 flex items-center justify-center rotate-90">
            <ArrowRight className="w-4 h-4 text-emerald-400" />
          </div>
        </div>
      </div>
    </section>
  );
}