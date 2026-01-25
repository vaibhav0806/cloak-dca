'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { WalletButton } from '@/components/wallet/WalletButton';
import { Dashboard } from '@/components/dashboard/Dashboard';
import { useWallet } from '@solana/wallet-adapter-react';
import { Shield, Lock, Zap, Eye, EyeOff, ChevronRight, Check, ArrowUpRight } from 'lucide-react';

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

        <nav className="hidden md:flex items-center gap-1">
          <a href="#how-it-works" className="px-4 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors rounded-lg hover:bg-white/5">
            How it works
          </a>
          <a href="#security" className="px-4 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors rounded-lg hover:bg-white/5">
            Security
          </a>
          <a href="#faq" className="px-4 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors rounded-lg hover:bg-white/5">
            FAQ
          </a>
        </nav>

        <WalletButton />
      </div>
    </header>
  );
}

function Footer() {
  return (
    <footer className="border-t border-border bg-card/30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-12">
          <div className="col-span-2 md:col-span-1">
            <span className="text-xl font-semibold tracking-tight">
              cloak<span className="text-accent">.</span>
            </span>
            <p className="mt-4 text-sm text-muted-foreground leading-relaxed">
              Private dollar-cost averaging on Solana. Trade without a trace.
            </p>
          </div>
          <div>
            <h4 className="font-medium mb-4 text-sm">Product</h4>
            <ul className="space-y-3 text-sm text-muted-foreground">
              <li><a href="#how-it-works" className="hover:text-foreground transition-colors">How it works</a></li>
              <li><a href="#security" className="hover:text-foreground transition-colors">Security</a></li>
              <li><a href="#faq" className="hover:text-foreground transition-colors">FAQ</a></li>
            </ul>
          </div>
          <div>
            <h4 className="font-medium mb-4 text-sm">Resources</h4>
            <ul className="space-y-3 text-sm text-muted-foreground">
              <li><a href="#" className="hover:text-foreground transition-colors">Documentation</a></li>
              <li><a href="#" className="hover:text-foreground transition-colors">GitHub</a></li>
              <li><a href="#" className="hover:text-foreground transition-colors">Audit Report</a></li>
            </ul>
          </div>
          <div>
            <h4 className="font-medium mb-4 text-sm">Community</h4>
            <ul className="space-y-3 text-sm text-muted-foreground">
              <li><a href="#" className="hover:text-foreground transition-colors">Twitter</a></li>
              <li><a href="#" className="hover:text-foreground transition-colors">Discord</a></li>
              <li><a href="#" className="hover:text-foreground transition-colors">Blog</a></li>
            </ul>
          </div>
        </div>
        <div className="pt-8 border-t border-border flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-sm text-muted-foreground">
            © 2024 Cloak Protocol. All rights reserved.
          </p>
          <div className="flex items-center gap-6 text-sm text-muted-foreground">
            <a href="#" className="hover:text-foreground transition-colors">Privacy</a>
            <a href="#" className="hover:text-foreground transition-colors">Terms</a>
          </div>
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
              <span className="text-xs sm:text-sm text-muted-foreground">Built on zero-knowledge cryptography</span>
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
                <span>Open source</span>
              </div>
              <div className="flex items-center gap-2">
                <Check className="h-4 w-4 text-accent" />
                <span>Audited contracts</span>
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

      {/* Visual explainer */}
      <section className="relative py-16 sm:py-24 border-t border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-center">
            <div>
              <p className="text-accent text-sm font-medium mb-4">The Problem</p>
              <h2 className="text-2xl sm:text-3xl md:text-4xl font-medium leading-tight mb-6">
                Your DCA strategy is public by default
              </h2>
              <p className="text-muted-foreground leading-relaxed mb-8">
                Every trade you make on-chain is visible. Watchers can see your accumulation patterns,
                front-run your orders, and track your entire portfolio. This puts you at a disadvantage.
              </p>
              <div className="space-y-4">
                <ProblemItem text="Visible wallet balances expose your holdings" />
                <ProblemItem text="Predictable DCA timing enables front-running" />
                <ProblemItem text="Transaction history reveals your strategy" />
              </div>
            </div>
            <div className="relative">
              <VisualDiagram type="problem" />
            </div>
          </div>
        </div>
      </section>

      {/* Solution */}
      <section className="relative py-16 sm:py-24 bg-card/30 border-t border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-center">
            <div className="order-2 lg:order-1">
              <VisualDiagram type="solution" />
            </div>
            <div className="order-1 lg:order-2">
              <p className="text-accent text-sm font-medium mb-4">The Solution</p>
              <h2 className="text-2xl sm:text-3xl md:text-4xl font-medium leading-tight mb-6">
                Cloak makes your trades invisible
              </h2>
              <p className="text-muted-foreground leading-relaxed mb-8">
                Using zero-knowledge proofs, Cloak breaks the link between your wallet and your trades.
                Deposit once, then accumulate privately—no one can trace your activity.
              </p>
              <div className="space-y-4">
                <SolutionItem text="Shielded balance hides your holdings" />
                <SolutionItem text="Private execution prevents front-running" />
                <SolutionItem text="Unlinkable transactions protect your strategy" />
              </div>
            </div>
          </div>
        </div>
      </section>

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
                Cloak is designed from the ground up with security as the top priority.
                Your funds remain in your control at all times.
              </p>

              <div className="space-y-6">
                <SecurityFeature
                  title="Non-custodial"
                  description="Your keys, your crypto. We never have access to your funds."
                />
                <SecurityFeature
                  title="Open source"
                  description="All code is publicly available for review on GitHub."
                />
                <SecurityFeature
                  title="Audited"
                  description="Smart contracts audited by leading security firms."
                />
                <SecurityFeature
                  title="Battle-tested cryptography"
                  description="Built on proven zero-knowledge proof systems."
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 sm:gap-6 content-start">
              <TechCard title="Privacy Protocol" value="Light Protocol" />
              <TechCard title="Proof System" value="Groth16" />
              <TechCard title="DEX Aggregator" value="Jupiter" />
              <TechCard title="Network" value="Solana" />
            </div>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="relative py-16 sm:py-24 lg:py-32 border-t border-border">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12 sm:mb-16">
            <p className="text-accent text-sm font-medium mb-4">FAQ</p>
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-medium">
              Common questions
            </h2>
          </div>

          <div className="space-y-4">
            <FAQItem
              question="How does Cloak protect my privacy?"
              answer="Cloak uses zero-knowledge proofs to break the on-chain link between your deposit and your trades. When you deposit, your funds enter a shielded pool. When trades execute, they come from this pool—not your wallet. This makes it cryptographically impossible to connect your identity to your trading activity."
            />
            <FAQItem
              question="Is Cloak custodial?"
              answer="No. Cloak is fully non-custodial. You maintain control of your funds at all times through cryptographic proofs. We never have access to your private keys or the ability to move your funds."
            />
            <FAQItem
              question="What tokens can I accumulate?"
              answer="Currently, you can deposit USDC and accumulate SOL, BONK, and other major Solana tokens. We're continuously adding support for more assets based on liquidity and demand."
            />
            <FAQItem
              question="How are trades executed?"
              answer="Trades are routed through Jupiter, Solana's leading DEX aggregator, ensuring you get the best available prices across all major DEXs. The protocol executes trades from the privacy pool on your specified schedule."
            />
            <FAQItem
              question="What are the fees?"
              answer="Cloak charges a small protocol fee on each trade execution. You'll also pay standard Solana network fees. There are no deposit or withdrawal fees."
            />
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="relative py-16 sm:py-24 lg:py-32 border-t border-border">
        <div className="absolute inset-0 bg-gradient-to-t from-accent/[0.04] to-transparent pointer-events-none" />
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative">
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-medium mb-6">
            Start accumulating privately
          </h2>
          <p className="text-base sm:text-lg text-muted-foreground mb-8 sm:mb-10 max-w-xl mx-auto">
            Join thousands of users who trust Cloak for private, automated crypto accumulation on Solana.
          </p>
          <a
            href="#"
            className="inline-flex items-center gap-2 text-sm text-accent hover:text-accent/80 transition-colors"
            onClick={(e) => {
              e.preventDefault();
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
          >
            Connect wallet to get started
            <ArrowUpRight className="h-4 w-4" />
          </a>
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

function TechCard({ title, value }: { title: string; value: string }) {
  return (
    <div className="p-4 sm:p-6 rounded-xl border border-border bg-background">
      <p className="text-xs sm:text-sm text-muted-foreground mb-1 sm:mb-2">{title}</p>
      <p className="text-sm sm:text-base font-medium">{value}</p>
    </div>
  );
}

function FAQItem({ question, answer }: { question: string; answer: string }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="border border-border rounded-xl overflow-hidden">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between p-4 sm:p-6 text-left hover:bg-card/50 transition-colors"
      >
        <span className="font-medium text-sm sm:text-base pr-4">{question}</span>
        <ChevronRight className={`h-5 w-5 text-muted-foreground shrink-0 transition-transform duration-200 ${isOpen ? 'rotate-90' : ''}`} />
      </button>
      {isOpen && (
        <div className="px-4 sm:px-6 pb-4 sm:pb-6">
          <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">{answer}</p>
        </div>
      )}
    </div>
  );
}

function VisualDiagram({ type }: { type: 'problem' | 'solution' }) {
  if (type === 'problem') {
    return (
      <div className="relative p-6 sm:p-8 rounded-2xl border border-border bg-card/50">
        <div className="space-y-4">
          {/* Wallet */}
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-muted flex items-center justify-center">
              <Eye className="h-5 w-5 text-muted-foreground" />
            </div>
            <div className="flex-1">
              <div className="text-sm font-medium">Your Wallet</div>
              <div className="text-xs text-muted-foreground">0x7a3f...8e2d</div>
            </div>
            <div className="text-xs text-red-400 bg-red-400/10 px-2 py-1 rounded">Visible</div>
          </div>

          {/* Arrow */}
          <div className="flex items-center gap-2 pl-5">
            <div className="w-0.5 h-8 bg-border" />
            <span className="text-xs text-muted-foreground">Direct transactions</span>
          </div>

          {/* DEX */}
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-muted flex items-center justify-center">
              <Zap className="h-5 w-5 text-muted-foreground" />
            </div>
            <div className="flex-1">
              <div className="text-sm font-medium">DEX</div>
              <div className="text-xs text-muted-foreground">Public order book</div>
            </div>
            <div className="text-xs text-red-400 bg-red-400/10 px-2 py-1 rounded">Tracked</div>
          </div>

          {/* Watchers */}
          <div className="mt-6 p-4 rounded-xl bg-red-500/5 border border-red-500/10">
            <div className="flex items-center gap-2 text-sm text-red-400">
              <Eye className="h-4 w-4" />
              <span>Watchers can see everything</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative p-6 sm:p-8 rounded-2xl border border-accent/20 bg-card/50">
      <div className="space-y-4">
        {/* Wallet */}
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center">
            <Lock className="h-5 w-5 text-accent" />
          </div>
          <div className="flex-1">
            <div className="text-sm font-medium">Your Wallet</div>
            <div className="text-xs text-muted-foreground">Deposits only</div>
          </div>
          <div className="text-xs text-accent bg-accent/10 px-2 py-1 rounded">Private</div>
        </div>

        {/* Arrow */}
        <div className="flex items-center gap-2 pl-5">
          <div className="w-0.5 h-8 bg-accent/30" />
          <span className="text-xs text-muted-foreground">Zero-knowledge proof</span>
        </div>

        {/* Shield */}
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center">
            <Shield className="h-5 w-5 text-accent" />
          </div>
          <div className="flex-1">
            <div className="text-sm font-medium">Cloak Pool</div>
            <div className="text-xs text-muted-foreground">Encrypted balance</div>
          </div>
          <div className="text-xs text-accent bg-accent/10 px-2 py-1 rounded">Shielded</div>
        </div>

        {/* Arrow */}
        <div className="flex items-center gap-2 pl-5">
          <div className="w-0.5 h-8 bg-accent/30" />
          <span className="text-xs text-muted-foreground">Anonymous execution</span>
        </div>

        {/* DEX */}
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center">
            <Zap className="h-5 w-5 text-accent" />
          </div>
          <div className="flex-1">
            <div className="text-sm font-medium">DEX (via Jupiter)</div>
            <div className="text-xs text-muted-foreground">Best price routing</div>
          </div>
          <div className="text-xs text-accent bg-accent/10 px-2 py-1 rounded">Unlinkable</div>
        </div>

        {/* Privacy indicator */}
        <div className="mt-6 p-4 rounded-xl bg-accent/5 border border-accent/10">
          <div className="flex items-center gap-2 text-sm text-accent">
            <EyeOff className="h-4 w-4" />
            <span>Your identity stays private</span>
          </div>
        </div>
      </div>
    </div>
  );
}
