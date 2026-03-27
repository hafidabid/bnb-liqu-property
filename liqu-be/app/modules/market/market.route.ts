import {
  DoneFuncWithErrOrRes,
  FastifyInstance,
  FastifyPluginOptions,
  FastifyReply,
  FastifyRequest,
} from 'fastify'
import MarketSchema from '#app/modules/market/market.schema'
import { getMarketStats, getPriceHistory, type PriceRange } from '#app/modules/market/market.service'

export default function (
  app: FastifyInstance,
  _: FastifyPluginOptions,
  done: DoneFuncWithErrOrRes
) {
  app.get(
    '/:tokenId/:chainId/stats',
    MarketSchema.getMarketStats,
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const { tokenId, chainId } = request.params as any
        const data = await getMarketStats(tokenId, chainId)

        return reply.send({ success: true, data })
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown error'

        return reply.status(500).send({ success: false, error: message })
      }
    }
  )

  app.get(
    '/:tokenId/:chainId/price-history',
    MarketSchema.getPriceHistory,
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const { tokenId, chainId } = request.params as any
        const { range } = request.query as { range?: PriceRange }
        const data = await getPriceHistory(tokenId, chainId, range ?? 'all')

        return reply.send({ success: true, data })
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown error'

        return reply.status(500).send({ success: false, error: message })
      }
    }
  )

  done()
}
