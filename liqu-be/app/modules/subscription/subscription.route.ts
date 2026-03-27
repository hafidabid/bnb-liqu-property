import {
  DoneFuncWithErrOrRes,
  FastifyInstance,
  FastifyPluginOptions,
  FastifyReply,
  FastifyRequest,
} from 'fastify'
import SubscriptionController from '#app/modules/subscription/subscription.controller'
import SubscriptionSchema from '#app/modules/subscription/subscription.schema'
import { Role } from '@prisma/client'

const jwtAuth = async (request: FastifyRequest, reply: FastifyReply) => {
  try {
    await request.jwtVerify()
  } catch {
    reply.status(401).send({ success: false, error: 'Unauthorized' })
  }
}

const adminAuth = async (request: FastifyRequest, reply: FastifyReply) => {
  try {
    await request.jwtVerify()
    const user = (request as any).user as { role: Role }
    if (user.role !== 'ADMIN') {
      reply.status(403).send({ success: false, error: 'Forbidden' })
    }
  } catch {
    reply.status(401).send({ success: false, error: 'Unauthorized' })
  }
}

export default function (
  app: FastifyInstance,
  _: FastifyPluginOptions,
  done: DoneFuncWithErrOrRes
) {
  app.post(
    '/',
    { ...SubscriptionSchema.setSubscription, preHandler: [jwtAuth] },
    SubscriptionController.setSubscription
  )
  app.get(
    '/:propertyId',
    { ...SubscriptionSchema.getSubscription, preHandler: [jwtAuth] },
    SubscriptionController.getSubscription
  )
  // Admin extend — registered at /v1/admin/subscription/:propertyId/extend via v1.ts
  app.patch(
    '/admin/:propertyId/extend',
    { ...SubscriptionSchema.extendSubscription, preHandler: [adminAuth] },
    SubscriptionController.extendSubscription
  )

  done()
}
