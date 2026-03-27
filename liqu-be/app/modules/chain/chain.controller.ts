import { FastifyRequest, FastifyReply } from 'fastify'
import ChainService from './chain.service.js'

const ChainController = {
  listChains: async (_request: FastifyRequest, reply: FastifyReply) => {
    const data = await ChainService.listChains()

    return reply.json(data)
  },

  getChain: async (
    request: FastifyRequest<{ Params: { chainId: string } }>,
    reply: FastifyReply
  ) => {
    const chainId = request.params.chainId
    const data = await ChainService.getChain(chainId)

    return reply.json(data)
  },

  proxyRpc: async (
    request: FastifyRequest<{ Params: { chainId: string }; Body: unknown }>,
    reply: FastifyReply
  ) => {
    const chainId = request.params.chainId
    const result = await ChainService.proxyRpc(chainId, request.body)

    return reply.send(result)
  },

  listContracts: async (
    request: FastifyRequest<{ Params: { chainId: string } }>,
    reply: FastifyReply
  ) => {
    const chainId = request.params.chainId
    const data = await ChainService.listContracts(chainId)

    return reply.json(data)
  },

  getContract: async (
    request: FastifyRequest<{ Params: { chainId: string; address: string } }>,
    reply: FastifyReply
  ) => {
    const chainId = request.params.chainId
    const { address } = request.params
    const data = await ChainService.getContract(chainId, address)

    return reply.json(data)
  },
}

export default ChainController
