import { ExternalLink } from 'lucide-react'
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { PropertyBadge, type PropertyStatus } from './PropertyBadge'

export interface Property {
  id: string
  name: string
  location: string
  apy: number
  pricePerToken: number
  totalValue: number
  thumbnailUrl?: string
  status: PropertyStatus
  latestTxHash?: string
  explorerUrl?: string
}

interface PropertyCardProps {
  property: Property
  onClick?: (property: Property) => void
}

export function PropertyCard({ property, onClick }: PropertyCardProps) {
  const { name, location, pricePerToken, totalValue, thumbnailUrl, status, latestTxHash, explorerUrl } = property

  return (
    <Card
      className="overflow-hidden transition-shadow hover:shadow-md cursor-pointer"
      onClick={() => onClick?.(property)}
    >
      <div className="relative h-48 bg-muted">
        {thumbnailUrl ? (
          <img
            src={thumbnailUrl}
            alt={name}
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-muted-foreground text-sm">
            No image
          </div>
        )}
        <div className="absolute top-3 left-3">
          <PropertyBadge status={status} />
        </div>
      </div>

      <CardHeader className="pb-2">
        <div>
          <h3 className="font-semibold leading-tight">{name}</h3>
          <p className="text-sm text-muted-foreground">{location}</p>
        </div>
      </CardHeader>

      <CardContent className="pb-2">
        <div className="flex items-center justify-between text-sm">
          <div>
            <p className="text-muted-foreground">APY</p>
            <p className="text-lg font-bold text-emerald-600">{(Math.random() * 30).toFixed(1)}%</p>
          </div>
          <div className="text-right">
            <p className="text-muted-foreground">Price / Token</p>
            <p className="font-semibold">${pricePerToken.toLocaleString()}</p>
          </div>
        </div>
      </CardContent>

      <CardFooter className="pt-2 border-t flex-col items-start gap-1.5">
        <p className="text-xs text-muted-foreground">
          Total value:{' '}
          <span className="font-medium text-foreground">
            ${totalValue.toLocaleString()}
          </span>
        </p>
        {latestTxHash && (
          <a
            href={`${explorerUrl ?? 'https://base-sepolia.blockscout.com'}/tx/${latestTxHash}`}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="flex items-center gap-1 text-xs text-primary hover:underline font-mono"
          >
            <span className="max-w-[180px] truncate">{latestTxHash}</span>
            <ExternalLink className="h-3 w-3 shrink-0" />
          </a>
        )}
      </CardFooter>
    </Card>
  )
}

export function PropertyCardSkeleton() {
  return (
    <Card className="overflow-hidden">
      <Skeleton className="h-48 w-full rounded-none" />
      <CardHeader className="pb-2">
        <Skeleton className="h-5 w-3/4" />
        <Skeleton className="h-4 w-1/2" />
      </CardHeader>
      <CardContent className="pb-2">
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-16" />
          <Skeleton className="h-8 w-20" />
        </div>
      </CardContent>
      <CardFooter className="pt-2 border-t">
        <Skeleton className="h-4 w-2/3" />
      </CardFooter>
    </Card>
  )
}
