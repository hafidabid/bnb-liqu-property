import { PropertyCard, PropertyCardSkeleton, type Property } from './PropertyCard'

interface PropertyGridProps {
  properties: Property[]
  onPropertyClick?: (property: Property) => void
  isLoading?: boolean
  skeletonCount?: number
}

export function PropertyGrid({
  properties,
  onPropertyClick,
  isLoading = false,
  skeletonCount = 6,
}: PropertyGridProps) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: skeletonCount }).map((_, i) => (
          <PropertyCardSkeleton key={i} />
        ))}
      </div>
    )
  }

  if (properties.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <p className="text-lg font-medium">No properties found</p>
        <p className="text-sm text-muted-foreground mt-1">
          Check back later for new listings.
        </p>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {properties.map((property) => (
        <PropertyCard
          key={property.id}
          property={property}
          onClick={onPropertyClick}
        />
      ))}
    </div>
  )
}
