interface TokenSaleProgressProps {
  bought: number      // USDC amount raised so far
  target: number      // USDC target fund amount
  label?: string
}

export function TokenSaleProgress({ bought, target, label }: TokenSaleProgressProps) {
  const pct = target > 0 ? Math.min(100, (bought / target) * 100) : 0
  const fmtUSD = (n: number) =>
    n >= 1_000_000 ? `$${(n / 1_000_000).toFixed(2)}M` : `$${(n / 1_000).toFixed(1)}K`

  return (
    <div className="space-y-1.5 px-4">
      {label && <p className="text-xs font-semibold text-muted-foreground">{label}</p>}
      <div className="flex items-center justify-between text-sm">
        <span className="font-bold text-primary">{fmtUSD(bought)}</span>
        <span className="text-muted-foreground">of {fmtUSD(target)}</span>
      </div>
      <div className="h-3 w-full overflow-hidden rounded-full border-2 border-foreground/10 bg-muted">
        <div
          className="h-full rounded-full bg-primary transition-all duration-500"
          style={{ width: `${pct}%` }}
        />
      </div>
      <p className="text-right text-xs font-semibold text-muted-foreground">{pct.toFixed(1)}% funded</p>
    </div>
  )
}
