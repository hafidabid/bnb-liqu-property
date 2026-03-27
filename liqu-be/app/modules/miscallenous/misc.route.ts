import {
  DoneFuncWithErrOrRes,
  FastifyInstance,
  FastifyPluginOptions,
} from 'fastify'
import MiscController from '#app/modules/miscallenous/misc.controller'
import MiscSchema from '#app/modules/miscallenous/misc.schema'

export default function (
  app: FastifyInstance,
  _: FastifyPluginOptions,
  done: DoneFuncWithErrOrRes
) {
  app.post(
    '/:chainId/approve-mint-principle',
    MiscSchema.approveMintPrinciple,
    MiscController.approveMintPrinciple
  )
  app.post('/:chainId/deal-usdc', MiscSchema.dealUSDC, MiscController.dealUSDC)
  done()
}
