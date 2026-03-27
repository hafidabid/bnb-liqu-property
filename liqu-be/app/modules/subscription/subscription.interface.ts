import { SubscriptionPlan } from '@prisma/client'

export interface SetSubscriptionInput {
  propertyId: string
  plan: SubscriptionPlan
}

export interface ExtendSubscriptionInput {
  days?: number
}
