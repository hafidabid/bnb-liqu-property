import {
  DoneFuncWithErrOrRes,
  FastifyInstance,
  FastifyPluginOptions,
} from 'fastify'
import ChainController from '#app/modules/chain/chain.controller'
import {
  ListChainsResponse,
  GetChainResponse,
  ListContractsResponse,
  GetContractResponse,
} from '#app/modules/chain/chain.schema'

export default function (
  app: FastifyInstance,
  _: FastifyPluginOptions,
  done: DoneFuncWithErrOrRes
) {
  /**
   * GET /v1/chains
   * Returns all active chains.
   */
  app.get(
    '/',
    {
      schema: {
        tags: ['Chain'],
        summary: 'List all active chains',
        response: ListChainsResponse,
      },
    },
    ChainController.listChains
  )

  /**
   * GET /v1/chains/:chainId
   * Returns a single chain by chainId.
   */
  app.get<{ Params: { chainId: string } }>(
    '/:chainId',
    {
      schema: {
        tags: ['Chain'],
        summary: 'Get a chain by chainId',
        params: {
          type: 'object',
          properties: {
            chainId: { type: 'string', description: 'Numeric chain ID (e.g. 84532)' },
          },
          required: ['chainId'],
        },
        response: GetChainResponse,
      },
    },
    ChainController.getChain
  )

  /**
   * GET /v1/chains/:chainId/contracts
   * Returns all active contracts for the given chainId.
   */
  app.get<{ Params: { chainId: string } }>(
    '/:chainId/contracts',
    {
      schema: {
        tags: ['Chain'],
        summary: 'List all active contracts for a chain',
        params: {
          type: 'object',
          properties: {
            chainId: { type: 'string', description: 'Numeric chain ID' },
          },
          required: ['chainId'],
        },
        response: ListContractsResponse,
      },
    },
    ChainController.listContracts
  )

  /**
   * GET /v1/chains/:chainId/contracts/:address
   * Returns a single contract with its ABI.
   */
  app.get<{ Params: { chainId: string; address: string } }>(
    '/:chainId/contracts/:address',
    {
      schema: {
        tags: ['Chain'],
        summary: 'Get a contract by address (with ABI)',
        params: {
          type: 'object',
          properties: {
            chainId: { type: 'string', description: 'Numeric chain ID' },
            address: { type: 'string', description: 'Contract address (0x...)' },
          },
          required: ['chainId', 'address'],
        },
        response: GetContractResponse,
      },
    },
    ChainController.getContract
  )

  done()
}
