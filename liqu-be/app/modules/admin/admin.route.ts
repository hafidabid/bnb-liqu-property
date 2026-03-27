import {
  DoneFuncWithErrOrRes,
  FastifyInstance,
  FastifyPluginOptions,
} from 'fastify'
import AdminController from '#app/modules/admin/admin.controller'
import AdminSchema from '#app/modules/admin/admin.schema'

export default function (
  app: FastifyInstance,
  _: FastifyPluginOptions,
  done: DoneFuncWithErrOrRes
) {
  app.post('/:chainId/mint-asset', AdminSchema.mintAsset, AdminController.mintAsset)

  done()
}
