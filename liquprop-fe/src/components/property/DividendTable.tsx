import { ExternalLink } from 'lucide-react'
import type { YieldDistribution } from '@/lib/apicall/property'

interface DividendTableProps {
  data: YieldDistribution[]
}

function fmt(raw: string): string {
  const n = Number(raw) / 1e6
  return `$${n.toFixed(2)}`
}

export function DividendTable({ data }: DividendTableProps) {
  if (data.length === 0) {
    return (
      <div className="flex h-32 items-center justify-center rounded-xl border-2 border-dashed border-foreground/20 text-sm text-muted-foreground">
        No distributions yet
      </div>
    )
  }

  return (
    <div className="overflow-x-auto rounded-xl border-2 border-foreground/10">
      <table className="w-full text-sm">
        <thead className="border-b-2 border-foreground/10 bg-muted/50">
          <tr>
            <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Date
            </th>
            <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Holder
            </th>
            <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Baseline
            </th>
            <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Platform
            </th>
            <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Total
            </th>
            <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Tx
            </th>
          </tr>
        </thead>
        <tbody>
          {data.map((d, i) => {
            const total = Number(d.totalAmount) / 1e6
            return (
              <tr
                key={d.id}
                className={`border-b border-foreground/5 transition-colors hover:bg-muted/30 ${i % 2 === 0 ? '' : 'bg-muted/10'}`}
              >
                <td className="px-4 py-3 text-muted-foreground">
                  {d.createdAt ? new Date(d.createdAt).toLocaleDateString() : '—'}
                </td>
                <td className="px-4 py-3 text-right font-medium text-primary">
                  {fmt(d.holderAmount)}
                </td>
                <td className="px-4 py-3 text-right font-medium text-violet-600">
                  {fmt(d.baselineAmount)}
                </td>
                <td className="px-4 py-3 text-right text-muted-foreground">
                  {fmt(d.platformFee)}
                </td>
                <td className="px-4 py-3 text-right font-bold">
                  ${total.toFixed(2)}
                </td>
                <td className="px-4 py-3 text-center">
                  {d.txHash ? (
                    <a
                      href={`https://sepolia.basescan.org/tx/${d.txHash}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                    >
                      <ExternalLink className="h-3 w-3" />
                      View
                    </a>
                  ) : (
                    <span className="text-xs text-muted-foreground">—</span>
                  )}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
