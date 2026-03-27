import {
  DoneFuncWithErrOrRes,
  FastifyInstance,
  FastifyPluginOptions,
} from 'fastify'
import IndexerController from '#app/modules/indexer/indexer.controller'
import IndexerSchema from '#app/modules/indexer/indexer.schema'

export default function (
  app: FastifyInstance,
  _: FastifyPluginOptions,
  done: DoneFuncWithErrOrRes
) {
  app.get(
    '/properties/registered',
    IndexerSchema.propertiesRegistered,
    IndexerController.proxyPropertyRegistered
  )
  app.get(
    '/properties/registered/:tokenId',
    IndexerSchema.propertyRegisteredById,
    IndexerController.proxyPropertyRegisteredById
  )
  app.get(
    '/yield-history/:tokenId',
    IndexerSchema.yieldHistory,
    IndexerController.proxyYieldHistory
  )
  app.get(
    '/reports/:tokenId',
    IndexerSchema.reports,
    IndexerController.proxyReports
  )
  app.get(
    '/platform-fees/:tokenId',
    IndexerSchema.platformFees,
    IndexerController.proxyPlatformFees
  )

  done()
}
