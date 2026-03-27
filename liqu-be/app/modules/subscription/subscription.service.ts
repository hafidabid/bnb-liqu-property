import prisma from '#prisma/prisma'
import { SubscriptionPlan } from '@prisma/client'

export const setSubscription = async (
  propertyId: string,
  plan: SubscriptionPlan,
  ownerAddress: string
) => {
  const property = await prisma.property.findUnique({ where: { id: propertyId } })
  if (!property) throw new Error('Property not found')
  if (property.ownerAddress !== ownerAddress.toLowerCase())
    throw new Error('Forbidden')

  const activeUntil =
    plan === 'MONTHLY'
      ? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
      : null

  return prisma.platformSubscription.upsert({
    where: { propertyId },
    update: { plan, activeUntil, updatedAt: new Date() },
    create: { propertyId, ownerAddress: ownerAddress.toLowerCase(), plan, activeUntil },
  })
}

export const getSubscription = async (propertyId: string, ownerAddress: string) => {
  const property = await prisma.property.findUnique({ where: { id: propertyId } })
  if (!property) throw new Error('Property not found')
  if (property.ownerAddress !== ownerAddress.toLowerCase())
    throw new Error('Forbidden')

  return prisma.platformSubscription.findUnique({ where: { propertyId } })
}

export const extendSubscription = async (propertyId: string, days = 30) => {
  const sub = await prisma.platformSubscription.findUnique({ where: { propertyId } })
  if (!sub) throw new Error('No subscription found')
  if (sub.plan !== 'MONTHLY') throw new Error('Only MONTHLY subscriptions can be extended')

  const base = sub.activeUntil && sub.activeUntil > new Date() ? sub.activeUntil : new Date()
  const newActiveUntil = new Date(base.getTime() + days * 24 * 60 * 60 * 1000)

  return prisma.platformSubscription.update({
    where: { propertyId },
    data: { activeUntil: newActiveUntil },
  })
}
