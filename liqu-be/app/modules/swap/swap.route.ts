import {
  DoneFuncWithErrOrRes,
  FastifyInstance,
  FastifyPluginOptions,
} from 'fastify'
import SwapController from '#app/modules/swap/swap.controller'
import SwapSchema from '#app/modules/swap/swap.schema'

export default function (
  app: FastifyInstance,
  _: FastifyPluginOptions,
  done: DoneFuncWithErrOrRes
) {
  app.post(
    '/:chainId/create-swap-tx',
    SwapSchema.createSwapTx,
    SwapController.createSwapTx
  )
  app.post(
    '/:chainId/submit-swap-tx',
    SwapSchema.submitSwapTx,
    SwapController.submitSwapTx
  )
  done()
}
