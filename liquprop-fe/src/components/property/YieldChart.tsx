import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
import type { YieldDistribution } from '@/lib/apicall/property'

interface YieldChartProps {
  data: YieldDistribution[]
}

export function YieldChart({ data }: YieldChartProps) {
  const chartData = data.map((d) => ({
    date: d.createdAt ? new Date(d.createdAt).toLocaleDateString() : '',
    holder: Number(d.holderAmount) / 1e6,
    baseline: Number(d.baselineAmount) / 1e6,
    platform: Number(d.platformFee) / 1e6,
  }))

  if (chartData.length === 0) {
    return (
      <div className="flex h-40 items-center justify-center rounded-xl border-2 border-dashed border-foreground/20 text-sm text-muted-foreground">
        No yield distributions yet
      </div>
    )
  }

  return (
    <ResponsiveContainer width="100%" height={200}>
      <AreaChart data={chartData} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="colorHolder" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#10B981" stopOpacity={0.3} />
            <stop offset="95%" stopColor="#10B981" stopOpacity={0} />
          </linearGradient>
          <linearGradient id="colorBaseline" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#8B5CF6" stopOpacity={0.3} />
            <stop offset="95%" stopColor="#8B5CF6" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
        <XAxis dataKey="date" tick={{ fontSize: 11 }} />
        <YAxis tickFormatter={(v) => `$${v}`} tick={{ fontSize: 11 }} />
        <Tooltip formatter={(v) => [`$${Number(v).toFixed(2)}`, '']} />
        <Area
          type="monotone"
          dataKey="holder"
          name="Holder"
          stroke="#10B981"
          fill="url(#colorHolder)"
          strokeWidth={2}
        />
        <Area
          type="monotone"
          dataKey="baseline"
          name="Baseline"
          stroke="#8B5CF6"
          fill="url(#colorBaseline)"
          strokeWidth={2}
        />
      </AreaChart>
    </ResponsiveContainer>
  )
}
