import { FastifyReply, FastifyRequest } from 'fastify'
import {
  createProperty,
  listProperties,
  getProperty,
  updateProperty,
  getMyProperties,
  uploadDocument,
  listDocuments,
  deleteDocument,
  setSLA,
  getSLA,
  submitReport,
  listReports,
  createYieldTx,
  submitYieldTx,
  getYieldHistory,
  createRegisterPropertyTxService,
  submitRegisterProperty,
  submitYieldAndReport,
  listTransactions,
  syncPropertyTransactions,
  submitDeployGuardTx,
  submitSwapTx,
  getRecentTransactions,
} from './property.service.js'
import { DocumentType } from '@prisma/client'

const PropertyController = {
  createProperty: async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const user = (request as any).user as { walletAddress: string }
      const body = request.body as any
      const data = await createProperty(body, user.walletAddress)
      reply.status(200).send({ success: true, data })
    } catch (error: any) {
      reply.status(400).send({ success: false, error: error.message })
    }
  },

  listProperties: async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { page, limit } = request.query as any
      const data = await listProperties(page, limit)
      reply.status(200).send({ success: true, data })
    } catch (error: any) {
      reply.status(500).send({ success: false, error: error.message })
    }
  },

  getProperty: async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { id } = request.params as any
      const data = await getProperty(id)
      reply.status(200).send({ success: true, data })
    } catch (error: any) {
      reply.status(404).send({ success: false, error: error.message })
    }
  },

  updateProperty: async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const user = (request as any).user as { walletAddress: string }
      const { id } = request.params as any
      const body = request.body as any
      const data = await updateProperty(id, body, user.walletAddress)
      reply.status(200).send({ success: true, data })
    } catch (error: any) {
      reply.status(400).send({ success: false, error: error.message })
    }
  },

  getMyProperties: async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const user = (request as any).user as { walletAddress: string }
      const { page, limit } = request.query as any
      const data = await getMyProperties(user.walletAddress, page, limit)
      reply.status(200).send({ success: true, data })
    } catch (error: any) {
      reply.status(500).send({ success: false, error: error.message })
    }
  },

  uploadDocument: async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const user = (request as any).user as { walletAddress: string }
      const { id } = request.params as any

      // Parse multipart fields
      const parts = (request as any).parts()
      let type: DocumentType = 'OTHER'
      let buffer: Buffer | null = null
      let directUrl: string | null = null
      let fileName = 'upload'
      let contentType = 'application/octet-stream'

      for await (const part of parts) {
        if (part.type === 'field') {
          if (part.fieldname === 'type') type = part.value as DocumentType
          if (part.fieldname === 'fileName') fileName = part.value
          if (part.fieldname === 'url') directUrl = part.value
        } else if (part.type === 'file') {
          fileName = part.filename || fileName
          contentType = part.mimetype || contentType
          const chunks: Buffer[] = []
          for await (const chunk of part.file) {
            chunks.push(chunk)
          }
          buffer = Buffer.concat(chunks)
        }
      }

      if (!buffer && !directUrl) {
        return reply.status(400).send({ success: false, error: 'No file or url provided' })
      }

      const data = await uploadDocument(
        id, user.walletAddress, type, fileName,
        buffer ?? directUrl!,
        contentType
      )
      reply.status(200).send({ success: true, data })
    } catch (error: any) {
      reply.status(400).send({ success: false, error: error.message })
    }
  },

  listDocuments: async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { id } = request.params as any
      const data = await listDocuments(id)
      reply.status(200).send({ success: true, data })
    } catch (error: any) {
      reply.status(500).send({ success: false, error: error.message })
    }
  },

  deleteDocument: async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const user = (request as any).user as { walletAddress: string }
      const { id, docId } = request.params as any
      await deleteDocument(id, docId, user.walletAddress)
      reply.status(200).send({ success: true })
    } catch (error: any) {
      reply.status(400).send({ success: false, error: error.message })
    }
  },

  setSLA: async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const user = (request as any).user as { walletAddress: string }
      const { id } = request.params as any
      const body = request.body as any
      const data = await setSLA(id, body, user.walletAddress)
      reply.status(200).send({ success: true, data })
    } catch (error: any) {
      reply.status(400).send({ success: false, error: error.message })
    }
  },

  getSLA: async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { id } = request.params as any
      const data = await getSLA(id)
      reply.status(200).send({ success: true, data })
    } catch (error: any) {
      reply.status(500).send({ success: false, error: error.message })
    }
  },

  submitReport: async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const user = (request as any).user as { walletAddress: string }
      const { id } = request.params as any

      const parts = (request as any).parts()
      let reportPeriodStart = ''
      let reportPeriodEnd = ''
      let description: string | undefined
      let onChainTxHash: string | undefined
      const docBuffers: Array<{ buffer: Buffer; fileName: string; contentType: string }> = []

      for await (const part of parts) {
        if (part.type === 'field') {
          if (part.fieldname === 'reportPeriodStart') reportPeriodStart = part.value
          if (part.fieldname === 'reportPeriodEnd') reportPeriodEnd = part.value
          if (part.fieldname === 'description') description = part.value
          if (part.fieldname === 'onChainTxHash') onChainTxHash = part.value
        } else if (part.type === 'file') {
          const chunks: Buffer[] = []
          for await (const chunk of part.file) {
            chunks.push(chunk)
          }
          docBuffers.push({
            buffer: Buffer.concat(chunks),
            fileName: part.filename || 'document',
            contentType: part.mimetype || 'application/octet-stream',
          })
        }
      }

      if (!reportPeriodStart || !reportPeriodEnd)
        return reply.status(400).send({ success: false, error: 'reportPeriodStart and reportPeriodEnd are required' })

      const data = await submitReport(
        id,
        user.walletAddress,
        reportPeriodStart,
        reportPeriodEnd,
        description,
        onChainTxHash,
        docBuffers
      )
      reply.status(200).send({ success: true, data })
    } catch (error: any) {
      reply.status(400).send({ success: false, error: error.message })
    }
  },

  listReports: async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { id } = request.params as any
      const data = await listReports(id)
      reply.status(200).send({ success: true, data })
    } catch (error: any) {
      reply.status(500).send({ success: false, error: error.message })
    }
  },

  createYieldTx: async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const user = (request as any).user as { walletAddress: string }
      const { id, chainId } = request.params as any
      const body = request.body as any
      const tx = await createYieldTx(id, user.walletAddress, body, chainId)
      reply.status(200).send({ success: true, data: tx })
    } catch (error: any) {
      reply.status(400).send({ success: false, error: error.message })
    }
  },

  submitYieldTx: async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const user = (request as any).user as { walletAddress: string }
      const { id, chainId } = request.params as any
      const body = request.body as any
      const txHash = await submitYieldTx(id, user.walletAddress, body, chainId)
      reply.status(200).send({ success: true, txHash })
    } catch (error: any) {
      reply.status(400).send({ success: false, error: error.message })
    }
  },

  getYieldHistory: async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { id } = request.params as any
      const data = await getYieldHistory(id)
      reply.status(200).send({ success: true, data })
    } catch (error: any) {
      reply.status(500).send({ success: false, error: error.message })
    }
  },

  createRegisterPropertyTx: async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const user = (request as any).user as { walletAddress: string }
      const { id, chainId } = request.params as any
      const body = request.body as any
      const tx = await createRegisterPropertyTxService(body, user.walletAddress, id, chainId)
      reply.status(200).send({ success: true, data: tx })
    } catch (error: any) {
      reply.status(400).send({ success: false, error: error.message })
    }
  },

  submitRegisterProperty: async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const user = (request as any).user as { walletAddress: string }
      const { id, chainId } = request.params as any
      const body = request.body as any
      const result = await submitRegisterProperty(body, user.walletAddress, id, chainId)
      reply.status(200).send({ success: true, ...result })
    } catch (error: any) {
      reply.status(400).send({ success: false, error: error.message })
    }
  },

  submitYieldAndReport: async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const user = (request as any).user as { walletAddress: string }
      const { id, chainId } = request.params as any
      const body = request.body as any
      const data = await submitYieldAndReport(id, user.walletAddress, body, chainId)
      reply.status(200).send({ success: true, data })
    } catch (error: any) {
      reply.status(400).send({ success: false, error: error.message })
    }
  },

  recentTransactions: async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { limit } = request.query as any
      const data = await getRecentTransactions(limit ? Number(limit) : 15)
      reply.status(200).send({ success: true, data })
    } catch (error: any) {
      reply.status(500).send({ success: false, error: error.message })
    }
  },

  listTransactions: async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { id } = request.params as any
      const { type, status } = request.query as any
      const data = await listTransactions(id, { type, status })
      reply.status(200).send({ success: true, data })
    } catch (error: any) {
      reply.status(500).send({ success: false, error: error.message })
    }
  },
  syncTransactions: async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { id } = request.params as any
      const data = await syncPropertyTransactions(id)
      reply.status(200).send({ success: true, data })
    } catch (error: any) {
      reply.status(500).send({ success: false, error: error.message })
    }
  },

  submitDeployGuardTx: async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const user = (request as any).user as { walletAddress: string }
      const { id, chainId } = request.params as any
      const body = request.body as any
      const result = await submitDeployGuardTx(body, user.walletAddress, id, chainId)
      reply.status(200).send({ success: true, ...result })
    } catch (error: any) {
      reply.status(400).send({ success: false, error: error.message })
    }
  },

  submitSwapTx: async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const user = (request as any).user as { walletAddress: string }
      const { id, chainId } = request.params as any
      const body = request.body as any
      const result = await submitSwapTx(body, user.walletAddress, id, chainId)
      reply.status(200).send({ success: true, ...result })
    } catch (error: any) {
      reply.status(400).send({ success: false, error: error.message })
    }
  },
}

export default PropertyController
