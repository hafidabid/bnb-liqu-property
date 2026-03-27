import { FastifyReply, FastifyRequest } from 'fastify'
import {
  getRegisteredProperties,
  getRegisteredPropertyById,
  getYieldHistory,
  getReports,
  getPlatformFees,
} from './indexer.service.js'

const IndexerController = {
  proxyPropertyRegistered: async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { after, limit } = request.query as any
      const result = await getRegisteredProperties(after, limit)
      reply.status(200).send({ success: true, ...result })
    } catch (error: any) {
      reply.status(500).send({ success: false, error: error.message })
    }
  },

  proxyPropertyRegisteredById: async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { tokenId } = request.params as any
      const data = await getRegisteredPropertyById(tokenId)
      reply.status(200).send({ success: true, data })
    } catch (error: any) {
      reply.status(500).send({ success: false, error: error.message })
    }
  },

  proxyYieldHistory: async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { tokenId } = request.params as any
      const items = await getYieldHistory(tokenId)
      reply.status(200).send({ success: true, items })
    } catch (error: any) {
      reply.status(500).send({ success: false, error: error.message })
    }
  },

  proxyReports: async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { tokenId } = request.params as any
      const items = await getReports(tokenId)
      reply.status(200).send({ success: true, items })
    } catch (error: any) {
      reply.status(500).send({ success: false, error: error.message })
    }
  },

  proxyPlatformFees: async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { tokenId } = request.params as any
      const data = await getPlatformFees(tokenId)
      reply.status(200).send({ success: true, data })
    } catch (error: any) {
      reply.status(500).send({ success: false, error: error.message })
    }
  },
}

export default IndexerController
