import { TrendingUp, DollarSign, Shield, Droplets, BarChart2 } from 'lucide-react'
import type { MarketStats } from '@/lib/apicall/market'

interface MarketStatsBarProps {
  stats: MarketStats | null
  loading?: boolean
}

interface StatPillProps {
  icon: React.ReactNode
  label: string
  value: string
  colorClass: string
}

function StatPill({ icon, label, value, colorClass }: StatPillProps) {
  return (
    <div className={`flex items-center gap-2 rounded-xl border-2 border-foreground/10 bg-card px-4 py-3 shadow-sm`}>
      <span className={colorClass}>{icon}</span>
      <div className="min-w-0">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</p>
        <p className="font-heading text-sm font-bold">{value}</p>
      </div>
    </div>
  )
}

function SkeletonPill() {
  return (
    <div className="h-[60px] animate-pulse rounded-xl border-2 border-foreground/10 bg-muted" />
  )
}

function fmt(n: number): string {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(2)}M`
  if (n >= 1_000) return `$${(n / 1_000).toFixed(1)}K`
  return `$${n.toFixed(2)}`
}

export function MarketStatsBar({ stats, loading }: MarketStatsBarProps) {
  if (loading) {
    return (
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {[...Array(5)].map((_, i) => <SkeletonPill key={i} />)}
      </div>
    )
  }

  if (!stats) return null

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
      <StatPill
        icon={<DollarSign className="h-4 w-4" />}
        label="Token Price"
        value={fmt(stats.currentPrice)}
        colorClass="text-primary"
      />
      <StatPill
        icon={<Shield className="h-4 w-4" />}
        label="Baseline Price"
        value={fmt(stats.baselinePrice)}
        colorClass="text-violet-500"
      />
      <StatPill
        icon={<BarChart2 className="h-4 w-4" />}
        label="TVL"
        value={fmt(stats.tvl)}
        colorClass="text-amber-500"
      />
      <StatPill
        icon={<Droplets className="h-4 w-4" />}
        label="Liquidity"
        value={fmt(stats.liquidity)}
        colorClass="text-sky-500"
      />
      <StatPill
        icon={<TrendingUp className="h-4 w-4" />}
        label="Yield Distributed"
        value={fmt(stats.totalYieldDistributed)}
        colorClass="text-pink-500"
      />
    </div>
  )
}
