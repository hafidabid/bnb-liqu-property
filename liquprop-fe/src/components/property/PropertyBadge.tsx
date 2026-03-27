import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

export type PropertyStatus = 'tokenized' | 'listed' | 'token_live' | 'coming-soon'

interface PropertyBadgeProps {
  status: PropertyStatus
  className?: string
}

const statusConfig: Record<PropertyStatus, { label: string; className: string }> = {
  tokenized: {
    label: 'Tokenized',
    className: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20 hover:bg-emerald-500/20',
  },
  listed: {
    label: 'Presale Active',
    className: 'bg-white text-blue-600 border-blue-500/20 hover:bg-grey-500/20',
  },
  token_live: {
    label: 'Token Live',
    className: 'bg-white text-indigo-600 border-black-500/20 hover:bg-grey-500/20',
  },
  'coming-soon': {
    label: 'Coming Soon',
    className: 'bg-amber-500/10 text-amber-600 border-amber-500/20 hover:bg-amber-500/20',
  },
}

export function PropertyBadge({ status, className }: PropertyBadgeProps) {
  const config = statusConfig[status]
  return (
    <Badge
      variant="outline"
      className={cn(config.className, className)}
    >
      {config.label}
    </Badge>
  )
}
