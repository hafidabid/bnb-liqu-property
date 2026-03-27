import {
  DoneFuncWithErrOrRes,
  FastifyInstance,
  FastifyPluginOptions,
} from 'fastify'
import ChainController from '#app/modules/chain/chain.controller'
import { RpcProxyBody } from '#app/modules/chain/chain.schema'

export default function (
  app: FastifyInstance,
  _: FastifyPluginOptions,
  done: DoneFuncWithErrOrRes
) {
  /**
   * POST /v1/rpc/:chainId
   * Proxies a JSON-RPC request to the active RPC URL for the given chain.
   * The client sends a standard JSON-RPC payload; the response is forwarded as-is.
   */
  app.post<{ Params: { chainId: string }; Body: unknown }>(
    '/:chainId',
    {
      schema: {
        tags: ['RPC'],
        summary: 'Proxy a JSON-RPC request to a chain RPC',
        params: {
          type: 'object',
          properties: {
            chainId: { type: 'string', description: 'Numeric chain ID (e.g. 84532)' },
          },
          required: ['chainId'],
        },
        body: RpcProxyBody,
      },
    },
    ChainController.proxyRpc
  )

  done()
}
