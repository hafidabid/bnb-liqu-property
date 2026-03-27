import {
  DoneFuncWithErrOrRes,
  FastifyInstance,
  FastifyPluginOptions,
} from 'fastify'
import FactoryController from '#app/modules/factory/factory.controller'
import FactorySchema from '#app/modules/factory/factory.schema'

export default function (
  app: FastifyInstance,
  _: FastifyPluginOptions,
  done: DoneFuncWithErrOrRes
) {
  app.post(
    '/:chainId/create-deploy-guard-tx',
    FactorySchema.createDeployGuardTx,
    FactoryController.createDeployGuardTx
  )
  app.post(
    '/:chainId/submit-deploy-guard-tx',
    FactorySchema.submitDeployGuardTx,
    FactoryController.submitDeployGuardTx
  )
  done()
}
