import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts'
import type { PricePoint, PriceRange } from '@/lib/apicall/market'

const RANGES: { label: string; value: PriceRange }[] = [
  { label: '1m', value: '1m' },
  { label: '5m', value: '5m' },
  { label: '30m', value: '30m' },
  { label: '1h', value: '1h' },
  { label: '12h', value: '12h' },
  { label: '1d', value: '1d' },
  { label: '1w', value: '1w' },
  { label: '1mo', value: '1mo' },
  { label: 'All', value: 'all' },
]

function formatTick(isoDate: string, range: PriceRange): string {
  const d = new Date(isoDate)
  if (range === '1m' || range === '5m' || range === '30m') {
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
  }
  if (range === '1h' || range === '12h' || range === '1d') {
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }
  return d.toLocaleDateString([], { month: 'short', day: 'numeric' })
}

interface PriceChartProps {
  data: PricePoint[]
  range: PriceRange
  onRangeChange: (range: PriceRange) => void
  loading?: boolean
}

export function PriceChart({ data, range, onRangeChange, loading }: PriceChartProps) {
  const chartData = data.map((p) => ({
    date: p.date,
    tokenPrice: Number(p.tokenPrice),
    baselinePrice: Number(p.baselinePrice),
  }))

  // Y-axis domain: ±25% of the data range so price movement is always visible
  const allPrices = chartData.flatMap((d) => [d.tokenPrice, d.baselinePrice]).filter(Boolean)
  const minPrice = allPrices.length ? Math.min(...allPrices) : 0
  const maxPrice = allPrices.length ? Math.max(...allPrices) : 1
  const yDomain: [number, number] = [minPrice * 0.75, maxPrice * 1.25]

  // Format a price number to full precision (no artificial truncation)
  function fmtPrice(v: number): string {
    if (v === 0) return '0'
    // Use up to 8 significant digits, strip trailing zeros
    return v.toPrecision(8).replace(/\.?0+$/, '')
  }

  return (
    <div className="space-y-3">
      {/* Range selector */}
      <div className="flex flex-wrap gap-1">
        {RANGES.map((r) => (
          <button
            key={r.value}
            onClick={() => onRangeChange(r.value)}
            className={`rounded-lg border-2 px-2.5 py-1 text-xs font-bold transition-all ${range === r.value
              ? 'border-foreground bg-foreground text-background shadow-pop-sm'
              : 'border-foreground/20 bg-muted text-muted-foreground hover:border-foreground/50 hover:text-foreground'
              }`}
          >
            {r.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="h-[220px] animate-pulse rounded-xl bg-muted" />
      ) : data.length === 0 ? (
        <div className="flex h-[220px] items-center justify-center rounded-xl border-2 border-dashed border-foreground/20 text-sm text-muted-foreground">
          No price data for this range
        </div>
      ) : (
        <>
          <p className="text-xs text-muted-foreground">
            * Token price reflects live market. Baseline is the protocol floor price.
          </p>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={chartData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
              <XAxis
                dataKey="date"
                tickFormatter={(v) => formatTick(v, range)}
                tick={{ fontSize: 10 }}
                minTickGap={40}
              />
              <YAxis
                tickFormatter={(v) => `$${fmtPrice(v)}`}
                tick={{ fontSize: 11 }}
                width={72}
                domain={yDomain}
              />
              <Tooltip
                labelFormatter={(v) => new Date(v).toLocaleString()}
                formatter={(v: any, name: any) => [
                  `$${fmtPrice(Number(v))}`,
                  name === 'tokenPrice' ? 'Token Price' : 'Baseline Price',
                ]}
              />
              <Legend formatter={(value) => value === 'tokenPrice' ? 'Token Price' : 'Baseline Price'} />
              <Line type="monotone" dataKey="tokenPrice" stroke="#10B981" strokeWidth={2.5} dot={false} name="tokenPrice" />
              <Line type="monotone" dataKey="baselinePrice" stroke="#8B5CF6" strokeWidth={2} dot={false} strokeDasharray="5 3" name="baselinePrice" />
            </LineChart>
          </ResponsiveContainer>
        </>
      )}
    </div>
  )
}
