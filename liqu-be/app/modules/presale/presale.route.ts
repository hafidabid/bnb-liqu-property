import {
  DoneFuncWithErrOrRes,
  FastifyInstance,
  FastifyPluginOptions,
} from 'fastify'
import PresaleController from '#app/modules/presale/presale.controller'
import PresaleSchema from '#app/modules/presale/presale.schema'

export default function (
  app: FastifyInstance,
  _: FastifyPluginOptions,
  done: DoneFuncWithErrOrRes
) {
  app.post(
    '/:chainId/create-presale-tx',
    PresaleSchema.createPresaleTx,
    PresaleController.createPresaleTx
  )
  app.post(
    '/:chainId/submit-presale-tx',
    PresaleSchema.submitPresaleTx,
    PresaleController.submitPresaleTx
  )
  app.post(
    '/:chainId/approve-usdc-presale',
    PresaleSchema.approveUSDCPresale,
    PresaleController.approveUSDCPresale
  )
  done()
}
