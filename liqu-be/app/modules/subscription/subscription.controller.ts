import { FastifyReply, FastifyRequest } from 'fastify'
import {
  setSubscription,
  getSubscription,
  extendSubscription,
} from './subscription.service.js'

const SubscriptionController = {
  setSubscription: async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const user = (request as any).user as { walletAddress: string }
      const { propertyId, plan } = request.body as any
      const data = await setSubscription(propertyId, plan, user.walletAddress)
      reply.status(200).send({ success: true, data })
    } catch (error: any) {
      reply.status(400).send({ success: false, error: error.message })
    }
  },

  getSubscription: async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const user = (request as any).user as { walletAddress: string }
      const { propertyId } = request.params as any
      const data = await getSubscription(propertyId, user.walletAddress)
      reply.status(200).send({ success: true, data })
    } catch (error: any) {
      reply.status(400).send({ success: false, error: error.message })
    }
  },

  extendSubscription: async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { propertyId } = request.params as any
      const { days } = (request.body as any) ?? {}
      const data = await extendSubscription(propertyId, days)
      reply.status(200).send({ success: true, data })
    } catch (error: any) {
      reply.status(400).send({ success: false, error: error.message })
    }
  },
}

export default SubscriptionController
