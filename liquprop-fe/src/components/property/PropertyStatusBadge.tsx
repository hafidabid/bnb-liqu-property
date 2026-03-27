import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import type { BackendPropertyStatus } from '@/lib/apicall/property'

interface PropertyStatusBadgeProps {
  status: BackendPropertyStatus
  className?: string
}

const statusConfig: Record<BackendPropertyStatus, { label: string; className: string }> = {
  DRAFT: {
    label: 'Draft',
    className: 'bg-gray-100 text-gray-600 border-gray-300',
  },
  PENDING_REVIEW: {
    label: 'Pending Review',
    className: 'bg-yellow-100 text-yellow-700 border-yellow-300',
  },
  REGISTERED: {
    label: 'Registered',
    className: 'bg-blue-100 text-blue-700 border-blue-300',
  },
  TOKENIZED: {
    label: 'Tokenized',
    className: 'bg-emerald-100 text-emerald-700 border-emerald-300',
  },
  LISTED: {
    label: 'Fundraising Open',
    className: 'bg-green-100 text-green-700 border-green-300',
  },
  TOKEN_LIVE: {
    label: 'Token Live',
    className: 'bg-white text-indigo-700 border-black-300',
  },
  SUSPENDED: {
    label: 'Suspended',
    className: 'bg-red-100 text-red-700 border-red-300',
  },
}

export function PropertyStatusBadge({ status, className }: PropertyStatusBadgeProps) {
  const config = statusConfig[status]
  return (
    <Badge variant="outline" className={cn(config.className, className)}>
      {config.label}
    </Badge>
  )
}
