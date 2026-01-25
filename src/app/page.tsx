'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { WalletButton } from '@/components/wallet/WalletButton';
import { Dashboard } from '@/components/dashboard/Dashboard';
import { useWallet } from '@solana/wallet-adapter-react';
import { Shield, Lock, Zap, Eye, EyeOff, Check, ArrowRight } from 'lucide-react';

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
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] sm:w-[1200px] h-[600px] sm:h-[800px] bg-gradient-radial from-accent/[0.08] via-accent/[0.02] to-transparent rounded-full blur-3xl" />
      </div>

      {/* Hero */}
      <section className="relative min-h-[100svh] flex items-center pt-20 sm:pt-0">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-20 w-full">
          <div className="max-w-4xl mx-auto text-center">
            {/* Trust badge */}
            <div
              className="inline-flex items-center gap-2 px-3 sm:px-4 py-1.5 sm:py-2 rounded-full border border-border bg-card/50 backdrop-blur-sm mb-8 sm:mb-10"
              style={{ animation: 'fadeSlideUp 0.7s ease-out forwards', opacity: 0 }}
            >
              <Shield className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-accent" />
              <span className="text-xs sm:text-sm text-muted-foreground">Zero-Knowledge DCA on Solana</span>
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

            {/* Trust indicators */}
            <div
              className="flex flex-wrap items-center justify-center gap-4 sm:gap-8 text-xs sm:text-sm text-muted-foreground"
              style={{ animation: 'fadeSlideUp 0.7s ease-out 0.3s forwards', opacity: 0 }}
            >
              <div className="flex items-center gap-2">
                <Check className="h-4 w-4 text-accent" />
                <span>Non-custodial</span>
              </div>
              <div className="flex items-center gap-2">
                <Check className="h-4 w-4 text-accent" />
                <span>Session keys</span>
              </div>
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
              icon={<Lock className="h-5 w-5 sm:h-6 sm:w-6" />}
            />
            <ProcessStep
              number="02"
              title="Configure"
              description="Set your strategy: target token, amount per trade, frequency. Sign once to authorize the protocol to execute on your behalf."
              icon={<Zap className="h-5 w-5 sm:h-6 sm:w-6" />}
            />
            <ProcessStep
              number="03"
              title="Accumulate"
              description="Trades execute automatically through the privacy pool. Your wallet never interacts with DEXs—complete anonymity, best prices."
              icon={<Shield className="h-5 w-5 sm:h-6 sm:w-6" />}
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
                <span className="text-accent">cloak</span> is designed from the ground up with security as the top priority.
                Your funds remain in your control at all times.
              </p>

              <div className="space-y-6">
                <SecurityFeature
                  title="Non-custodial"
                  description="Your keys, your crypto. We never have access to your funds."
                />
                <SecurityFeature
                  title="Session keys"
                  description="Deterministic keypairs authorize trades without exposing your primary wallet."
                />
                <SecurityFeature
                  title="Zero-knowledge proofs"
                  description="Cryptographic proofs verify transactions without revealing sensitive data."
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
function ProblemItem({ text }: { text: string }) {
  return (
    <div className="flex items-start gap-3">
      <div className="mt-1.5 w-1.5 h-1.5 rounded-full bg-red-500/70 shrink-0" />
      <p className="text-muted-foreground">{text}</p>
    </div>
  );
}

function SolutionItem({ text }: { text: string }) {
  return (
    <div className="flex items-start gap-3">
      <Check className="h-5 w-5 text-accent shrink-0 mt-0.5" />
      <p className="text-foreground">{text}</p>
    </div>
  );
}

function ProcessStep({ number, title, description, icon }: {
  number: string;
  title: string;
  description: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="group relative p-6 sm:p-8 rounded-2xl border border-border bg-card/50 hover:bg-card hover:border-accent/20 transition-all duration-300">
      <div className="flex items-center gap-4 mb-4 sm:mb-6">
        <div className="flex items-center justify-center w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-accent/10 text-accent group-hover:bg-accent/20 transition-colors">
          {icon}
        </div>
        <span className="text-3xl sm:text-4xl font-light text-muted-foreground/30">{number}</span>
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
      { threshold: 0.15 }
    );

    if (sectionRef.current) {
      observer.observe(sectionRef.current);
    }

    return () => observer.disconnect();
  }, []);

  return (
    <section ref={sectionRef} className="relative py-20 sm:py-28 lg:py-36 border-t border-border overflow-hidden">
      {/* Section header */}
      <div className={`text-center mb-16 sm:mb-20 px-4 transition-all duration-700 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
        <p className="text-accent text-sm font-medium mb-4 tracking-wide">Why privacy matters</p>
        <h2 className="text-3xl sm:text-4xl md:text-5xl font-medium tracking-tight">
          See the difference <span className="text-accent">cloak</span> makes
        </h2>
      </div>

      {/* Full-width dramatic comparison */}
      <div className="relative min-h-[500px] sm:min-h-[550px] lg:min-h-[480px]">
        {/* EXPOSED SIDE - Left/Top */}
        <div className={`absolute inset-0 lg:inset-y-0 lg:left-0 lg:right-1/2 transition-all duration-1000 ${isVisible ? 'opacity-100' : 'opacity-0'}`}>
          {/* Red danger gradient background */}
          <div className="absolute inset-0 bg-gradient-to-br from-red-950/40 via-red-900/20 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-r from-red-500/[0.08] to-transparent" />

          {/* Animated surveillance grid */}
          <div className="absolute inset-0 opacity-[0.03]" style={{
            backgroundImage: `repeating-linear-gradient(0deg, transparent, transparent 40px, rgba(239,68,68,0.5) 40px, rgba(239,68,68,0.5) 41px),
                              repeating-linear-gradient(90deg, transparent, transparent 40px, rgba(239,68,68,0.5) 40px, rgba(239,68,68,0.5) 41px)`
          }} />

          {/* Floating eye icons - surveillance feeling */}
          <div className="absolute top-[15%] left-[10%] animate-float-slow">
            <Eye className="w-6 h-6 text-red-500/20" />
          </div>
          <div className="absolute top-[60%] left-[20%] animate-float-slower">
            <Eye className="w-4 h-4 text-red-500/15" />
          </div>
          <div className="absolute top-[35%] left-[5%] animate-float">
            <Eye className="w-5 h-5 text-red-500/10" />
          </div>

          {/* Exposed data visualization */}
          <div className="absolute top-[20%] left-[15%] sm:left-[20%] opacity-30">
            <div className="font-mono text-[10px] text-red-400/60 space-y-1">
              <div className="animate-pulse">0x7f2c...4e8a</div>
              <div className="animate-pulse" style={{animationDelay: '0.5s'}}>→ 500 USDC</div>
              <div className="animate-pulse" style={{animationDelay: '1s'}}>→ SOL swap</div>
            </div>
          </div>

          {/* Scan lines */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <div className="absolute inset-x-0 h-[2px] bg-gradient-to-r from-transparent via-red-500/30 to-transparent animate-scan" />
            <div className="absolute inset-x-0 h-[1px] bg-gradient-to-r from-transparent via-red-400/20 to-transparent animate-scan" style={{animationDelay: '1.5s'}} />
          </div>
        </div>

        {/* PROTECTED SIDE - Right/Bottom */}
        <div className={`absolute inset-0 lg:inset-y-0 lg:right-0 lg:left-1/2 transition-all duration-1000 delay-300 ${isVisible ? 'opacity-100' : 'opacity-0'}`}>
          {/* Warm protective gradient */}
          <div className="absolute inset-0 bg-gradient-to-bl from-accent/20 via-accent/5 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-l from-accent/[0.1] to-transparent" />

          {/* Shield pattern overlay */}
          <div className="absolute inset-0 opacity-[0.02]" style={{
            backgroundImage: `radial-gradient(circle at 2px 2px, var(--accent) 1px, transparent 1px)`,
            backgroundSize: '32px 32px'
          }} />

          {/* Protective glow orbs */}
          <div className="absolute top-[20%] right-[15%] w-32 h-32 bg-accent/20 rounded-full blur-3xl animate-pulse" />
          <div className="absolute bottom-[30%] right-[25%] w-24 h-24 bg-accent/10 rounded-full blur-2xl animate-pulse" style={{animationDelay: '1s'}} />

          {/* Shield icons */}
          <div className="absolute top-[25%] right-[12%] animate-float-slow">
            <Shield className="w-6 h-6 text-accent/20" />
          </div>
          <div className="absolute bottom-[35%] right-[8%] animate-float">
            <Lock className="w-5 h-5 text-accent/15" />
          </div>
        </div>

        {/* CENTER DIVIDER - The Cloak Effect */}
        <div className={`hidden lg:block absolute inset-y-0 left-1/2 w-32 -translate-x-1/2 z-10 transition-all duration-1000 delay-500 ${isVisible ? 'opacity-100' : 'opacity-0'}`}>
          {/* Gradient blend */}
          <div className="absolute inset-0 bg-gradient-to-r from-red-950/50 via-background to-accent/20" />

          {/* Animated cloak sweep */}
          <div className="absolute inset-0 overflow-hidden">
            <div className="absolute inset-y-0 w-1 left-1/2 -translate-x-1/2 bg-gradient-to-b from-transparent via-accent/50 to-transparent animate-pulse" />
          </div>

          {/* Center transformation icon */}
          <div className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 transition-all duration-700 delay-700 ${isVisible ? 'scale-100 rotate-0' : 'scale-0 rotate-180'}`}>
            <div className="relative">
              <div className="absolute inset-0 bg-accent/30 rounded-full blur-xl scale-150 animate-pulse" />
              <div className="relative w-16 h-16 rounded-full bg-background border-2 border-accent flex items-center justify-center shadow-[0_0_40px_rgba(255,99,71,0.4)]">
                <ArrowRight className="w-6 h-6 text-accent" />
              </div>
            </div>
          </div>
        </div>

        {/* CONTENT OVERLAY */}
        <div className="relative z-20 h-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-8 lg:gap-16 h-full py-8">
            {/* Left content - Problem */}
            <div className={`flex flex-col justify-center transition-all duration-700 delay-200 ${isVisible ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-8'}`}>
              <div className="bg-background/60 backdrop-blur-sm rounded-2xl p-6 sm:p-8 border border-red-500/20 shadow-[0_0_60px_rgba(239,68,68,0.1)]">
                <div className="flex items-center gap-3 mb-5">
                  <div className="w-12 h-12 rounded-xl bg-red-500/20 flex items-center justify-center border border-red-500/30">
                    <Eye className="w-6 h-6 text-red-400" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-red-400 uppercase tracking-widest">Exposed</p>
                    <p className="text-xl font-semibold text-red-100">Public by default</p>
                  </div>
                </div>

                <p className="text-red-200/60 text-sm leading-relaxed mb-6">
                  Every trade you make on-chain is visible. Watchers can see your patterns and front-run your orders.
                </p>

                <div className="space-y-3">
                  {['Wallet balances exposed', 'DCA timing visible to bots', 'Full history trackable'].map((text, i) => (
                    <div
                      key={text}
                      className={`flex items-center gap-3 transition-all duration-500 ${isVisible ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-4'}`}
                      style={{ transitionDelay: `${400 + i * 150}ms` }}
                    >
                      <div className="w-2 h-2 rounded-full bg-red-500 shrink-0 animate-pulse" style={{animationDelay: `${i * 0.3}s`}} />
                      <p className="text-red-200/80 text-sm">{text}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Right content - Solution */}
            <div className={`flex flex-col justify-center transition-all duration-700 delay-400 ${isVisible ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-8'}`}>
              <div className="bg-background/60 backdrop-blur-sm rounded-2xl p-6 sm:p-8 border border-accent/30 shadow-[0_0_60px_rgba(255,99,71,0.15)]">
                <div className="flex items-center gap-3 mb-5">
                  <div className="w-12 h-12 rounded-xl bg-accent/20 flex items-center justify-center border border-accent/30 shadow-[0_0_20px_rgba(255,99,71,0.2)]">
                    <EyeOff className="w-6 h-6 text-accent" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-accent uppercase tracking-widest">Protected</p>
                    <p className="text-xl font-semibold">Invisible by design</p>
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
                      style={{ transitionDelay: `${600 + i * 150}ms` }}
                    >
                      <div className="w-5 h-5 rounded-full bg-accent/20 flex items-center justify-center shrink-0">
                        <Check className="w-3 h-3 text-accent" />
                      </div>
                      <p className="text-foreground text-sm font-medium">{text}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Mobile center arrow */}
        <div className={`lg:hidden absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-30 transition-all duration-500 delay-300 ${isVisible ? 'opacity-100 scale-100' : 'opacity-0 scale-50'}`}>
          <div className="w-12 h-12 rounded-full bg-background border-2 border-accent flex items-center justify-center shadow-[0_0_30px_rgba(255,99,71,0.3)] rotate-90">
            <ArrowRight className="w-5 h-5 text-accent" />
          </div>
        </div>
      </div>
    </section>
  );
}