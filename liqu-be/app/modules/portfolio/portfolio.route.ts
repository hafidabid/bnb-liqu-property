import {
  DoneFuncWithErrOrRes,
  FastifyInstance,
  FastifyPluginOptions,
  FastifyReply,
  FastifyRequest,
} from 'fastify'
import PortfolioSchema from '#app/modules/portfolio/portfolio.schema'
import { getPortfolio, buildClaimYieldTx, submitClaimYieldTx } from '#app/modules/portfolio/portfolio.service'

const jwtAuth = async (request: FastifyRequest, reply: FastifyReply) => {
  try {
    await request.jwtVerify()
  } catch {
    reply.status(401).send({ success: false, error: 'Unauthorized' })
  }
}

export default function (
  app: FastifyInstance,
  _: FastifyPluginOptions,
  done: DoneFuncWithErrOrRes
) {
  app.get(
    '/:chainId',
    { ...PortfolioSchema.getPortfolio, preHandler: [jwtAuth] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const user = (request as any).user as { walletAddress: string }
        const { chainId } = request.params as any
        const data = await getPortfolio(user.walletAddress, chainId)

        return reply.send({ success: true, data })
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown error'

        return reply.status(500).send({ success: false, error: message })
      }
    }
  )

  // POST /v1/portfolio/claim-yield/:chainId/create-tx
  app.post(
    '/claim-yield/:chainId/create-tx',
    { ...PortfolioSchema.createClaimYieldTx, preHandler: [jwtAuth] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const user = (request as any).user as { walletAddress: string }
        const { chainId } = request.params as any
        const { tokenId } = request.body as { tokenId: string }
        const data = await buildClaimYieldTx(tokenId, user.walletAddress, chainId)

        return reply.send({ success: true, data })
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown error'

        return reply.status(500).send({ success: false, error: message })
      }
    }
  )

  // POST /v1/portfolio/claim-yield/:chainId/submit
  app.post(
    '/claim-yield/:chainId/submit',
    { ...PortfolioSchema.submitClaimYieldTx, preHandler: [jwtAuth] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const { chainId } = request.params as any
        const { tx } = request.body as { tokenId: string; tx: string }
        const data = await submitClaimYieldTx(tx as `0x${string}`)

        return reply.send({ success: true, data })
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown error'

        return reply.status(500).send({ success: false, error: message })
      }
    }
  )

  done()
}
