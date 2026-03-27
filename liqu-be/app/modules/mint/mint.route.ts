import {
  DoneFuncWithErrOrRes,
  FastifyInstance,
  FastifyPluginOptions,
} from 'fastify'
import MintController from '#app/modules/mint/mint.controller'
import MintSchema from '#app/modules/mint/mint.schema'

export default function (
  app: FastifyInstance,
  _: FastifyPluginOptions,
  done: DoneFuncWithErrOrRes
) {
  app.post(
    '/:chainId/create-approve-mint-principle-tx',
    MintSchema.approveMintPrinciple,
    MintController.approveMintPrinciple
  )
  app.post(
    '/:chainId/create-mint-principle-tx',
    MintSchema.mintPrinciple,
    MintController.mintPrinciple
  )
  app.post(
    '/:chainId/submit-mint-principle',
    MintSchema.submitMintPrinciple,
    MintController.submitMintPrinciple
  )

  done()
}
