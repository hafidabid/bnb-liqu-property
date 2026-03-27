import { useEffect, useState } from 'react'
import { Clock, Coins, Calendar, Tag, TrendingUp } from 'lucide-react'
import { TokenSaleProgress } from './TokenSaleProgress'

interface PresalePosition {
  timestamp: bigint
  expiry: bigint
  presaleAmount: bigint
  totalSupply: bigint
  presalePrice: bigint
}

interface PresalePanelProps {
  positionData: PresalePosition
}

function formatCountdown(seconds: number): string {
  if (seconds <= 0) return 'Ended'
  const d = Math.floor(seconds / 86400)
  const h = Math.floor((seconds % 86400) / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = seconds % 60
  if (d > 0) return `${d}d ${h}h ${m}m`
  if (h > 0) return `${h}h ${m}m ${s}s`
  return `${m}m ${s}s`
}

export function PresalePanel({ positionData }: PresalePanelProps) {
  const now = Math.floor(Date.now() / 1000)
  const expiry = Number(positionData.expiry)
  const startTs = Number(positionData.timestamp)
  // presalePrice is raw USDC (6 decimals)
  const presalePriceUSD = Number(positionData.presalePrice) / 1e6
  const presaleRemaining = Number(positionData.presaleAmount)
  const totalSupply = Number(positionData.totalSupply)
  const distributed = totalSupply - presaleRemaining

  const isSoldOut = presaleRemaining === 0
  const isActive = now < expiry && !isSoldOut

  const [secondsLeft, setSecondsLeft] = useState(Math.max(0, expiry - now))

  useEffect(() => {
    if (!isActive) return
    const timer = setInterval(() => {
      setSecondsLeft((s) => {
        const next = s - 1
        if (next <= 0) {
          clearInterval(timer)
          return 0
        }
        return next
      })
    }, 1000)
    return () => clearInterval(timer)
  }, [isActive])

  const statusBadge = isSoldOut
    ? 'text-amber-700 bg-amber-50 border-amber-200'
    : isActive
      ? 'text-emerald-700 bg-emerald-50 border-emerald-200'
      : 'text-muted-foreground bg-muted border-foreground/10'
  const statusLabel = isSoldOut ? 'Sold Out' : isActive ? 'Presale Live' : 'Presale Ended'

  return (
    <div className="rounded-2xl border-2 border-foreground bg-card p-5 shadow-pop space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="font-heading font-bold">Presale Info</h3>
        <span className={`rounded-full border px-2.5 py-0.5 text-xs font-semibold ${statusBadge}`}>
          {statusLabel}
        </span>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 gap-2">
        <div className="rounded-xl border border-foreground/10 bg-muted p-3">
          <div className="flex items-center gap-1.5 text-muted-foreground mb-1">
            <Tag className="h-3 w-3" />
            <span className="text-[10px] font-semibold uppercase tracking-wider">Price / Token</span>
          </div>
          <p className="font-heading font-bold text-primary">
            ${presalePriceUSD.toLocaleString(undefined, { maximumFractionDigits: 4 })}
          </p>
        </div>

        <div className="rounded-xl border border-foreground/10 bg-muted p-3">
          <div className="flex items-center gap-1.5 text-muted-foreground mb-1">
            <Coins className="h-3 w-3" />
            <span className="text-[10px] font-semibold uppercase tracking-wider">Remaining</span>
          </div>
          <p className="font-heading font-bold">{presaleRemaining.toLocaleString()}</p>
        </div>

        <div className="rounded-xl border border-foreground/10 bg-muted p-3">
          <div className="flex items-center gap-1.5 text-muted-foreground mb-1">
            <TrendingUp className="h-3 w-3" />
            <span className="text-[10px] font-semibold uppercase tracking-wider">Total Supply</span>
          </div>
          <p className="font-heading font-bold">{totalSupply.toLocaleString()}</p>
        </div>

        <div className="rounded-xl border border-foreground/10 bg-muted p-3">
          <div className="flex items-center gap-1.5 text-muted-foreground mb-1">
            <Clock className="h-3 w-3" />
            <span className="text-[10px] font-semibold uppercase tracking-wider">
              {isActive ? 'Ends In' : 'Ended On'}
            </span>
          </div>
          <p className={`text-sm font-semibold ${isActive && secondsLeft < 3600 ? 'text-red-500' : ''}`}>
            {isActive
              ? formatCountdown(secondsLeft)
              : new Date(expiry * 1000).toLocaleDateString()}
          </p>
        </div>
      </div>

      {/* Dates row */}
      <div className="flex items-center justify-between rounded-xl border border-foreground/10 bg-muted px-3 py-2 text-xs">
        <div className="flex items-center gap-1.5 text-muted-foreground">
          <Calendar className="h-3 w-3" />
          <span>
            Started{' '}
            <span className="font-semibold text-foreground">
              {new Date(startTs * 1000).toLocaleDateString()}
            </span>
          </span>
        </div>
        {!isActive && !isSoldOut && (
          <span className="text-muted-foreground">
            Ended{' '}
            <span className="font-semibold text-foreground">
              {new Date(expiry * 1000).toLocaleDateString()}
            </span>
          </span>
        )}
        {isActive && (
          <span className="text-muted-foreground">
            Ends{' '}
            <span className="font-semibold text-foreground">
              {new Date(expiry * 1000).toLocaleDateString()}
            </span>
          </span>
        )}
      </div>

      {/* Distribution progress */}
      <TokenSaleProgress
        bought={distributed}
        target={totalSupply}
        label="Token Distribution"
      />
    </div>
  )
}

/** Compact version for use in list cards */
export function PresaleMiniInfo({
  positionData,
}: {
  positionData: PresalePosition
}) {
  const now = Math.floor(Date.now() / 1000)
  const expiry = Number(positionData.expiry)
  const presalePriceUSD = Number(positionData.presalePrice) / 1e6
  const presaleRemaining = Number(positionData.presaleAmount)
  const totalSupply = Number(positionData.totalSupply)

  const isSoldOut = presaleRemaining === 0
  const isActive = now < expiry && !isSoldOut

  const [secondsLeft, setSecondsLeft] = useState(Math.max(0, expiry - now))

  useEffect(() => {
    if (!isActive) return
    const timer = setInterval(() => {
      setSecondsLeft((s) => {
        const next = s - 1
        if (next <= 0) { clearInterval(timer); return 0 }
        return next
      })
    }, 1000)
    return () => clearInterval(timer)
  }, [isActive])

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-xs px-4">
        <span className="flex items-center gap-1 text-muted-foreground">
          <Tag className="h-3 w-3" />
          <span className="font-semibold text-foreground">
            ${presalePriceUSD.toLocaleString(undefined, { maximumFractionDigits: 4 })}/token
          </span>
        </span>
        {isActive ? (
          <span className="flex items-center gap-1 text-amber-600 font-semibold">
            <Clock className="h-3 w-3" />
            {formatCountdown(secondsLeft)}
          </span>
        ) : isSoldOut ? (
          <span className="text-amber-600 font-semibold">Sold Out</span>
        ) : (
          <span className="text-muted-foreground font-semibold">Ended</span>
        )}
      </div>
      <TokenSaleProgress
        bought={totalSupply - presaleRemaining}
        target={totalSupply}
      />
    </div>
  )
}
