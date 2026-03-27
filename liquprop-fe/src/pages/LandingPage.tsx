import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useConnectModal } from '@rainbow-me/rainbowkit'
import { authService } from '@/lib/apicall/auth'
import {
  ArrowRight,
  Sparkles,
  Shield,
  Brain,
  TrendingUp,
  Zap,
  CheckCircle2,
  Building2,
  ChevronRight,
  Star,
  Globe,
  Lock,
} from 'lucide-react'
import Header from '@/components/layout/Header'

// Stat ticker items
const tickerItems = [
  { label: 'Total Value Locked', value: '$124M+' },
  { label: 'Properties Tokenized', value: '80+' },
  { label: 'Average APY', value: '11.4%' },
  { label: 'Active Investors', value: '5,200+' },
  { label: 'AI Verifications', value: '99.8%' },
  { label: 'Countries', value: '18' },
]

// Feature cards
const features = [
  {
    icon: Brain,
    title: 'AI Property Verification',
    description:
      'Our AI engine cross-references satellite imagery, market data, and on-chain records to verify every property — eliminating fraud before it happens.',
    color: 'bg-primary',
    shadow: 'shadow-pop-emerald',
    badge: 'Anti-Fraud',
    badgeBg: 'bg-primary text-white',
  },
  {
    icon: Shield,
    title: 'Baseline Protection',
    description:
      'Every asset is backed by a dynamic baseline guarantee. Your investment value cannot fall below the baseline — it only grows over time.',
    color: 'bg-secondary',
    shadow: 'shadow-pop-pink',
    badge: 'Protected',
    badgeBg: 'bg-secondary text-white',
  },
  {
    icon: Building2,
    title: 'Tokenized Securities',
    description:
      'Real property ownership on-chain. Each token represents a legally-backed fractional ownership, with on-chain dividends and full transparency.',
    color: 'bg-tertiary',
    shadow: 'shadow-pop-violet',
    badge: 'On-Chain',
    badgeBg: 'bg-tertiary text-white',
  },
  {
    icon: Zap,
    title: 'DeFi Integration',
    description:
      'Use your property tokens in Uniswap liquidity pools or as Chainlink-priced collateral. Real estate meets the full power of DeFi.',
    color: 'bg-quaternary',
    shadow: 'shadow-pop-amber',
    badge: 'DeFi',
    badgeBg: 'bg-quaternary text-foreground',
  },
]

// Steps
const steps = [
  {
    number: '01',
    title: 'Connect Your Wallet',
    description:
      'Sign in with any Web3 wallet via SIWE. No email, no KYC friction — just your wallet.',
    color: 'bg-primary',
  },
  {
    number: '02',
    title: 'Browse AI-Verified Properties',
    description:
      'Explore properties validated by our AI with real-time satellite data and market analysis.',
    color: 'bg-secondary',
  },
  {
    number: '03',
    title: 'Invest & Earn Yield',
    description:
      'Buy fractional tokens, earn rental yield on-chain, and trade anytime via Uniswap.',
    color: 'bg-tertiary',
  },
]

// Trust badges
const trustItems = [
  { icon: Globe, label: 'Chainlink Oracles', sub: 'Real-time pricing' },
  { icon: Zap, label: 'Uniswap V4', sub: 'Instant liquidity' },
  { icon: Lock, label: 'Baseline Guarantee', sub: 'Value protected' },
  { icon: Star, label: 'AI Anti-Fraud', sub: '99.8% accuracy' },
]

export default function LandingPage() {
  const navigate = useNavigate()
  const { openConnectModal } = useConnectModal()

  useEffect(() => {
    const checkAuth = () => {
      if (authService.isTokenValid()) {
        navigate('/dashboard')
      }
    }
    
    // Check on mount
    checkAuth()

    // Listen for SIWE login completion
    window.addEventListener('auth_changed', checkAuth)
    return () => window.removeEventListener('auth_changed', checkAuth)
  }, [navigate])

  return (
    <div className="min-h-screen bg-background">
      <Header />

      {/* ─── HERO ─────────────────────────────────────────────── */}
      <section className="relative overflow-hidden py-20 md:py-28">
        {/* Background decorations */}
        <div className="pointer-events-none absolute -left-40 top-1/2 h-[500px] w-[500px] -translate-y-1/2 rounded-full bg-primary opacity-25" />
        <div className="pointer-events-none absolute -right-24 -top-24 h-64 w-64 rounded-full bg-primary opacity-10" />
        <div className="dot-grid pointer-events-none absolute inset-0 opacity-20" />

        <div className="container relative z-10">
          <div className="grid items-center gap-12 lg:grid-cols-2">
            {/* Left: content */}
            <div className="space-y-7">
              {/* <div className="inline-flex items-center gap-2 rounded-full border-2 border-foreground bg-primary px-4 py-1.5 text-sm font-bold shadow-pop">
                <Sparkles className="h-4 w-4" strokeWidth={2.5} />
                Web3 × Real Estate — The Future is Liquid
              </div> */}

              <h1 className="font-heading text-5xl font-extrabold leading-[1.1] tracking-tight md:text-6xl lg:text-7xl">
                Tokenize
                <br />
                Properties.{' '}
                <span className="relative inline-block text-primary">
                  Invest
                  <svg
                    className="absolute -bottom-2 left-0 w-full"
                    viewBox="0 0 200 12"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      d="M2 9 Q50 2 100 8 Q150 14 198 7"
                      stroke="#FBBF24"
                      strokeWidth="4"
                      strokeLinecap="round"
                      fill="none"
                    />
                  </svg>
                </span>{' '}
                Smarter.
              </h1>

              <p className="max-w-lg text-lg leading-relaxed text-muted-foreground">
                Own fractions of premium real estate through tokenized securities.
                Protected by AI verification, backed by a dynamic baseline
                guarantee, and powered by DeFi.
              </p>

              <div className="flex flex-wrap gap-3">
                <button className="btn-candy" onClick={openConnectModal}>
                  Connect Wallet
                  <ArrowRight className="h-4 w-4" strokeWidth={2.5} />
                </button>
                <button className="btn-outline-pop">
                  Explore Properties
                  <ChevronRight className="h-4 w-4" strokeWidth={2.5} />
                </button>
              </div>

              {/* Quick stats */}
              <div className="flex flex-wrap gap-8 border-t-2 border-border pt-6">
                {[
                  { val: '$124M+', lab: 'Total Value Locked' },
                  { val: '11.4%', lab: 'Avg Annual Yield' },
                  { val: '80+', lab: 'AI-Verified Properties' },
                ].map((s) => (
                  <div key={s.lab}>
                    <div className="font-heading text-2xl font-extrabold">{s.val}</div>
                    <div className="text-xs font-medium text-muted-foreground">{s.lab}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Right: mock property card visual */}
            <div className="relative flex items-center justify-center">
              {/* Dot pattern background */}
              <div className="dot-grid absolute inset-0 rounded-3xl opacity-40" />

              {/* Floating shapes */}
              <div className="animate-float absolute -top-6 -right-4 h-14 w-14 rounded-full border-2 border-foreground bg-primary shadow-pop" />
              <div className="animate-float-alt absolute bottom-8 -left-6 h-10 w-10 rotate-45 border-2 border-foreground bg-quaternary shadow-pop" />
              <div className="animate-float absolute top-16 -left-3 h-8 w-8 rounded-full border-2 border-foreground bg-secondary shadow-pop" />

              {/* Mock property card */}
              <div className="relative z-10 w-full max-w-sm rounded-2xl border-2 border-foreground bg-card shadow-pop-pink transition-all duration-500 hover:-rotate-1 hover:scale-[1.02]">
                {/* Property image placeholder */}
                <div className="relative h-48 overflow-hidden rounded-t-xl bg-gradient-to-br from-primary/20 to-secondary/20">
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Building2 className="h-20 w-20 text-primary/30" strokeWidth={1.5} />
                  </div>
                  {/* Status badge */}
                  <div className="absolute left-3 top-3 rounded-full border-2 border-foreground bg-quaternary px-3 py-1 text-xs font-bold shadow-pop">
                    ✓ AI Verified
                  </div>
                  {/* Yield badge */}
                  <div className="absolute right-3 top-3 rounded-full border-2 border-foreground bg-tertiary px-3 py-1 text-xs font-bold shadow-pop text-white">
                    12.4% APY
                  </div>
                </div>

                <div className="p-5 space-y-3">
                  <div>
                    <h3 className="font-heading text-xl font-bold">Skyline Penthouse</h3>
                    <p className="text-sm text-muted-foreground">New York, NY · Floor 42</p>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="rounded-lg border-2 border-border bg-muted p-2.5">
                      <div className="text-xs font-medium text-muted-foreground">Price/Token</div>
                      <div className="font-heading text-lg font-bold">$250</div>
                    </div>
                    <div className="rounded-lg border-2 border-border bg-muted p-2.5">
                      <div className="text-xs font-medium text-muted-foreground">Total Value</div>
                      <div className="font-heading text-lg font-bold">$8.5M</div>
                    </div>
                  </div>

                  <button className="btn-candy w-full justify-center text-sm">
                    Invest Now
                    <ArrowRight className="h-3.5 w-3.5" strokeWidth={2.5} />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── TICKER / MARQUEE ─────────────────────────────────── */}
      <div className="border-y-2 border-foreground bg-primary py-3 overflow-hidden">
        <div className="flex animate-marquee whitespace-nowrap">
          {[...tickerItems, ...tickerItems].map((item, i) => (
            <span key={i} className="mx-8 inline-flex items-center gap-2 text-sm font-bold text-white">
              <span className="text-tertiary">◆</span>
              <span className="opacity-75">{item.label}:</span>
              <span>{item.value}</span>
            </span>
          ))}
        </div>
      </div>

      {/* ─── FEATURES ─────────────────────────────────────────── */}
      <section className="py-24">
        <div className="container">
          <div className="mb-14 text-center space-y-4">
            <div className="inline-flex items-center gap-2 rounded-full border-2 border-foreground bg-muted px-4 py-1.5 text-sm font-bold">
              <Sparkles className="h-4 w-4 text-primary" strokeWidth={2.5} />
              Why LiquProp
            </div>
            <h2 className="font-heading text-4xl font-extrabold md:text-5xl">
              The Platform Built for{' '}
              <span className="text-primary">Smart Investors</span>
            </h2>
            <p className="mx-auto max-w-2xl text-lg text-muted-foreground">
              Every feature exists to protect your capital, grow your wealth,
              and keep your assets genuinely liquid.
            </p>
          </div>

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {features.map((f) => {
              const Icon = f.icon
              return (
                <div
                  key={f.title}
                  className={`group relative rounded-2xl border-2 border-foreground bg-card p-6 ${f.shadow} transition-all duration-300 ease-bouncy hover:-rotate-1 hover:scale-[1.03] hover:-translate-y-1`}
                >
                  {/* Floating icon circle */}
                  <div className={`mb-5 flex h-14 w-14 items-center justify-center rounded-full border-2 border-foreground ${f.color} shadow-pop`}>
                    <Icon className="h-7 w-7 text-white" strokeWidth={2.5} />
                  </div>

                  <div className={`mb-3 inline-flex rounded-full border border-foreground/20 px-2.5 py-0.5 text-xs font-bold ${f.badgeBg}`}>
                    {f.badge}
                  </div>

                  <h3 className="font-heading mb-2 text-lg font-bold">{f.title}</h3>
                  <p className="text-sm leading-relaxed text-muted-foreground">{f.description}</p>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* ─── HOW IT WORKS ─────────────────────────────────────── */}
      <section className="relative overflow-hidden bg-muted py-24">
        <div className="dot-grid pointer-events-none absolute inset-0 opacity-30" />
        <div className="pointer-events-none absolute -right-32 top-12 h-80 w-80 rounded-full bg-secondary opacity-10" />

        <div className="container relative z-10">
          <div className="mb-14 text-center space-y-4">
            <div className="inline-flex items-center gap-2 rounded-full border-2 border-foreground bg-tertiary px-4 py-1.5 text-sm font-bold shadow-pop">
              <TrendingUp className="h-4 w-4" strokeWidth={2.5} />
              Get Started in 3 Steps
            </div>
            <h2 className="font-heading text-4xl font-extrabold md:text-5xl">
              Simple as{' '}
              <span className="text-primary">1, 2, 3</span>
            </h2>
          </div>

          <div className="relative grid gap-8 md:grid-cols-3">
            {/* Dashed connector line (desktop) */}
            <div className="pointer-events-none absolute left-[16.5%] top-10 hidden h-0.5 w-[67%] border-t-2 border-dashed border-foreground/30 md:block" />

            {steps.map((step, i) => (
              <div key={i} className="group text-center space-y-4">
                {/* Number bubble */}
                <div className="relative mx-auto flex h-20 w-20 items-center justify-center">
                  <div className={`flex h-20 w-20 items-center justify-center rounded-full border-2 border-foreground ${step.color} shadow-pop transition-all duration-300 ease-bouncy group-hover:-translate-y-2 group-hover:shadow-pop-hover`}>
                    <span className="font-heading text-2xl font-extrabold text-white">{step.number}</span>
                  </div>
                </div>

                <div className="rounded-2xl border-2 border-foreground bg-card p-6 shadow-pop transition-all duration-300 ease-bouncy group-hover:-translate-y-1 group-hover:shadow-pop-hover">
                  <h3 className="font-heading mb-2 text-xl font-bold">{step.title}</h3>
                  <p className="text-sm leading-relaxed text-muted-foreground">{step.description}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-12 text-center">
            <button className="btn-candy" onClick={openConnectModal}>
              Start Investing Now
              <ArrowRight className="h-4 w-4" strokeWidth={2.5} />
            </button>
          </div>
        </div>
      </section>

      {/* ─── TRUST / PARTNERS ─────────────────────────────────── */}
      <section className="py-24">
        <div className="container">
          <div className="mb-12 text-center">
            <h2 className="font-heading text-3xl font-extrabold md:text-4xl">
              Built on the{' '}
              <span className="text-primary">Best Infrastructure</span>
            </h2>
            <p className="mt-3 text-muted-foreground">
              Powered by industry-leading protocols and verified by AI.
            </p>
          </div>

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {trustItems.map((item) => {
              const Icon = item.icon
              return (
                <div
                  key={item.label}
                  className="flex flex-col items-center gap-3 rounded-2xl border-2 border-foreground bg-card p-6 shadow-pop text-center transition-all duration-200 ease-bouncy hover:-translate-y-1 hover:shadow-pop-hover"
                >
                  <div className="flex h-12 w-12 items-center justify-center rounded-full border-2 border-foreground bg-muted">
                    <Icon className="h-6 w-6 text-primary" strokeWidth={2.5} />
                  </div>
                  <div>
                    <div className="font-heading font-bold">{item.label}</div>
                    <div className="text-sm text-muted-foreground">{item.sub}</div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* ─── FINAL CTA ────────────────────────────────────────── */}
      <section className="relative overflow-hidden border-t-2 border-foreground bg-primary py-24">
        <div className="pointer-events-none absolute -left-20 -top-20 h-64 w-64 rounded-full bg-white opacity-5" />
        <div className="pointer-events-none absolute -bottom-16 -right-16 h-96 w-96 rounded-full bg-secondary opacity-20" />
        <div className="dot-grid pointer-events-none absolute inset-0 opacity-10" />

        <div className="container relative z-10 text-center space-y-6">
          <div className="inline-flex items-center gap-2 rounded-full border-2 border-white/40 bg-white/10 px-4 py-1.5 text-sm font-bold text-white">
            <Star className="h-4 w-4" strokeWidth={2.5} />
            Join 5,200+ investors
          </div>

          <h2 className="font-heading text-4xl font-extrabold text-white md:text-5xl lg:text-6xl">
            Your Real Estate Portfolio
            <br />
            Starts Here.
          </h2>

          <p className="mx-auto max-w-xl text-lg text-white/75">
            Fractional ownership, AI-backed valuations, DeFi liquidity — all
            under one roof. Connect your wallet and start in minutes.
          </p>

          <div className="flex flex-wrap justify-center gap-4 pt-2">
            <button
              className="inline-flex items-center gap-2 rounded-full border-2 border-white bg-white px-8 py-3.5 text-base font-bold text-primary shadow-[4px_4px_0px_0px_rgba(255,255,255,0.3)] transition-all duration-200 ease-bouncy hover:-translate-x-0.5 hover:-translate-y-0.5"
              onClick={openConnectModal}
            >
              Connect Wallet
              <ArrowRight className="h-4 w-4" strokeWidth={2.5} />
            </button>
            <button className="inline-flex items-center gap-2 rounded-full border-2 border-white/60 bg-transparent px-8 py-3.5 text-base font-bold text-white transition-colors hover:bg-white/10">
              Read the Docs
              <ChevronRight className="h-4 w-4" strokeWidth={2.5} />
            </button>
          </div>

          {/* Checklist */}
          <div className="flex flex-wrap justify-center gap-x-8 gap-y-2 pt-4">
            {['No minimum investment', 'Instant liquidity', 'AI anti-fraud protection', 'Baseline value guarantee'].map(
              (item) => (
                <span key={item} className="flex items-center gap-1.5 text-sm text-white/80">
                  <CheckCircle2 className="h-4 w-4 text-quaternary" strokeWidth={2.5} />
                  {item}
                </span>
              )
            )}
          </div>
        </div>
      </section>

      {/* ─── FOOTER ───────────────────────────────────────────── */}
      <footer className="border-t-2 border-foreground bg-background py-8">
        <div className="container flex flex-col items-center justify-between gap-4 sm:flex-row">
          <div className="flex items-center gap-2">
            <span className="font-heading text-lg font-extrabold">LiquProp</span>
            <span className="text-sm text-muted-foreground">— Real Estate, Reimagined.</span>
          </div>
          <p className="text-sm text-muted-foreground">
            &copy; {new Date().getFullYear()} LiquProp. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  )
}
