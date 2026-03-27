import { useState } from 'react'
import { useWalletClient, useChainId, usePublicClient } from 'wagmi'
import { useNavigate } from 'react-router-dom'
import {
  ExternalLink,
  Coins,
  Zap,
  TrendingUp,
  Clock,
  ArrowUpRight,
  ShoppingCart,
  Lock,
} from 'lucide-react'
import { PropertyStatusBadge } from './PropertyStatusBadge'
import { invalidateCache } from '@/lib/cache'
import { loadContractAddresses } from '@/lib/apicall/chains'
import { PrincipleTokenABI } from '@/lib/abis'
import type { PortfolioHolding } from '@/lib/apicall/portfolio'
import type { BackendPropertyStatus } from '@/lib/apicall/property'

interface PortfolioHoldingCardProps {
  holding: PortfolioHolding
  onYieldClaimed?: () => void
}

function fmt(n: number): string {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(2)}M`
  if (n >= 1_000) return `$${(n / 1_000).toFixed(1)}K`
  return `$${n.toFixed(4)}`
}

// ─── Mode helpers ─────────────────────────────────────────────────────────────

type HoldingMode = 'fundraise' | 'live' | 'pending'

function resolveMode(status: string): HoldingMode {
  if (status === 'TOKEN_LIVE') return 'live'
  if (status === 'LISTED') return 'fundraise'
  return 'pending'
}

const modeConfig = {
  live: {
    border: 'border-emerald-400',
    headerBg: 'bg-emerald-50',
    badge: {
      bg: 'bg-emerald-500',
      text: 'text-white',
      label: 'Live Market',
      dot: 'bg-white',
    },
    valueBg: 'bg-emerald-50 border-emerald-200',
    valueColor: 'text-emerald-700',
    yieldBg: 'border-2 border-amber-300 bg-amber-50',
    yieldColor: 'text-amber-700',
    priceLabel: 'Live Price',
    priceColor: 'text-emerald-600',
  },
  fundraise: {
    border: 'border-blue-300',
    headerBg: 'bg-blue-50',
    badge: {
      bg: 'bg-blue-500',
      text: 'text-white',
      label: 'Presale Active',
      dot: 'bg-white',
    },
    valueBg: 'bg-blue-50 border-blue-200',
    valueColor: 'text-blue-700',
    yieldBg: 'border-2 border-violet-200 bg-violet-50',
    yieldColor: 'text-violet-700',
    priceLabel: 'Presale Price',
    priceColor: 'text-blue-600',
  },
  pending: {
    border: 'border-foreground/20',
    headerBg: 'bg-muted/50',
    badge: {
      bg: 'bg-muted',
      text: 'text-muted-foreground',
      label: 'Awaiting Launch',
      dot: 'bg-muted-foreground',
    },
    valueBg: 'bg-muted/40 border-foreground/10',
    valueColor: 'text-muted-foreground',
    yieldBg: 'border-2 border-foreground/10 bg-muted/30',
    yieldColor: 'text-muted-foreground',
    priceLabel: 'Token Price',
    priceColor: 'text-foreground',
  },
}

export function PortfolioHoldingCard({ holding, onYieldClaimed }: PortfolioHoldingCardProps) {
  const navigate = useNavigate()
  const { data: walletClient } = useWalletClient()
  const publicClient = usePublicClient()
  const chainId = useChainId()
  const [claiming, setClaiming] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const mode = resolveMode(holding.propertyStatus)
  const cfg = modeConfig[mode]

  const handleClaimYield = async () => {
    if (!walletClient || !publicClient) return
    setClaiming(true)
    setError(null)
    try {
      const contracts = await loadContractAddresses(chainId)
      const ptAddress = contracts['CH_PT']
      if (!ptAddress) throw new Error('Contract address not found for this chain.')

      const txHash = await walletClient.writeContract({
        address: ptAddress,
        abi: PrincipleTokenABI,
        functionName: 'claimYield',
        args: [BigInt(holding.tokenId)],
      })
      await publicClient.waitForTransactionReceipt({ hash: txHash })
      invalidateCache('portfolio:')
      onYieldClaimed?.()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to claim yield')
    } finally {
      setClaiming(false)
    }
  }

  return (
    <div className={`rounded-2xl border-2 ${cfg.border} bg-card shadow-pop overflow-hidden space-y-0`}>

      {/* ── Mode header bar ──────────────────────────────────────────────── */}
      <div className={`${cfg.headerBg} px-4 py-2 flex items-center justify-between`}>
        <div className="flex items-center gap-2">
          <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold ${cfg.badge.bg} ${cfg.badge.text}`}>
            <span className={`h-1.5 w-1.5 rounded-full ${cfg.badge.dot} ${mode === 'live' ? 'animate-pulse' : ''}`} />
            {cfg.badge.label}
          </span>
        </div>
        <PropertyStatusBadge status={holding.propertyStatus as BackendPropertyStatus} />
      </div>

      <div className="p-5 space-y-4">
        {/* ── Property name + address ──────────────────────────────────────── */}
        <div className="min-w-0">
          <h3 className="font-heading font-bold truncate">{holding.propertyName}</h3>
          <p className="text-xs text-muted-foreground truncate mt-0.5">{holding.propertyAddress}</p>
        </div>

        {/* ── Token + value stats ───────────────────────────────────────────── */}
        <div className="grid grid-cols-3 gap-2">
          <div className="rounded-lg border border-foreground/10 bg-background p-2 text-center">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Tokens</p>
            <p className="font-heading text-sm font-bold">{holding.balanceFormatted.toLocaleString()}</p>
          </div>
          <div className={`rounded-lg border p-2 text-center ${cfg.valueBg}`}>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Value</p>
            <p className={`font-heading text-sm font-bold ${cfg.valueColor}`}>{fmt(holding.currentValue)}</p>
          </div>
          <div className="rounded-lg border border-foreground/10 bg-background p-2 text-center">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{cfg.priceLabel}</p>
            <p className={`font-heading text-sm font-bold ${cfg.priceColor}`}>{fmt(holding.currentPrice)}</p>
          </div>
        </div>

        {/* ── Mode-specific context strip ───────────────────────────────────── */}
        {mode === 'live' && (
          <div className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50/70 px-3 py-2 text-xs text-emerald-700">
            <TrendingUp className="h-3.5 w-3.5 flex-shrink-0" />
            <span className="font-medium">Token is trading live — price updates every 45s from chain</span>
          </div>
        )}
        {mode === 'fundraise' && (
          <div className="flex items-center gap-2 rounded-lg border border-blue-200 bg-blue-50/70 px-3 py-2 text-xs text-blue-700">
            <Clock className="h-3.5 w-3.5 flex-shrink-0" />
            <span className="font-medium">Presale in progress — tokens will trade after fundraise closes</span>
          </div>
        )}
        {mode === 'pending' && (
          <div className="flex items-center gap-2 rounded-lg border border-foreground/10 bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
            <Lock className="h-3.5 w-3.5 flex-shrink-0" />
            <span>Property is being tokenized — check back soon</span>
          </div>
        )}

        {/* ── Yield / presale info ──────────────────────────────────────────── */}
        {mode === 'live' ? (
          <div className={`flex items-center justify-between rounded-lg px-3 py-2.5 ${cfg.yieldBg}`}>
            <div className="flex items-center gap-2">
              <Zap className="h-4 w-4 text-amber-500" />
              <div>
                <p className="text-xs text-muted-foreground">Pending Yield</p>
                <p className={`font-heading text-sm font-bold ${cfg.yieldColor}`}>{fmt(holding.pendingYield)}</p>
              </div>
            </div>
            {holding.claimedYield > 0 && (
              <div className="text-right">
                <p className="text-xs text-muted-foreground">Claimed</p>
                <p className="text-sm font-semibold text-muted-foreground">{fmt(holding.claimedYield)}</p>
              </div>
            )}
          </div>
        ) : mode === 'fundraise' ? (
          <div className={`rounded-lg px-3 py-2.5 ${cfg.yieldBg}`}>
            <div className="flex items-center gap-2 mb-1">
              <Zap className="h-4 w-4 text-violet-400" />
              <p className="text-xs font-semibold text-violet-700">Yield starts after TOKEN_LIVE launch</p>
            </div>
            <p className="text-[11px] text-muted-foreground">
              Your tokens are locked in presale. Yield distributions begin once the fundraise closes and the property goes live on-market.
            </p>
          </div>
        ) : (
          <div className={`rounded-lg px-3 py-2.5 ${cfg.yieldBg}`}>
            <p className="text-[11px] text-muted-foreground">
              This property is being set up. Yield and trading will be available once tokenization is complete.
            </p>
          </div>
        )}

        {/* ── Error ────────────────────────────────────────────────────────── */}
        {error && <p className="text-xs text-red-500 font-medium">{error}</p>}

        {/* ── Actions ──────────────────────────────────────────────────────── */}
        <div className="flex gap-2">
          <button
            onClick={() => navigate(`/property/${holding.propertyId}`)}
            className="btn-outline-pop flex items-center gap-1.5 text-xs flex-1"
          >
            <ExternalLink className="h-3 w-3" /> Details
          </button>

          {mode === 'live' && (
            <button
              onClick={() => navigate(`/property/${holding.propertyId}`)}
              className="btn-candy flex items-center gap-1.5 text-xs flex-1"
            >
              <ArrowUpRight className="h-3 w-3" /> Trade
            </button>
          )}

          {mode === 'fundraise' && (
            <button
              onClick={() => navigate(`/property/${holding.propertyId}`)}
              className="flex items-center gap-1.5 rounded-xl border-2 border-blue-400 bg-blue-500 px-3 py-2 text-xs font-bold text-white shadow-[2px_2px_0_#1e40af] transition-all hover:-translate-y-0.5 hover:shadow-[3px_3px_0_#1e40af] flex-1 justify-center"
            >
              <ShoppingCart className="h-3 w-3" /> Buy More
            </button>
          )}

          {holding.pendingYield > 0 && mode === 'live' && (
            <button
              onClick={handleClaimYield}
              disabled={claiming || !walletClient}
              className="flex items-center gap-1.5 rounded-xl border-2 border-amber-400 bg-amber-400 px-3 py-2 text-xs font-bold text-foreground shadow-[2px_2px_0_#92400e] transition-all hover:-translate-y-0.5 hover:shadow-[3px_3px_0_#92400e] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Coins className="h-3 w-3" />
              {claiming ? 'Claiming…' : 'Claim'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
