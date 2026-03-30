import {
  DoneFuncWithErrOrRes,
  FastifyInstance,
  FastifyPluginOptions,
  FastifyReply,
  FastifyRequest,
} from 'fastify'
import PropertyController from '#app/modules/property/property.controller'
import PropertySchema from '#app/modules/property/property.schema'

const jwtAuth = async (request: FastifyRequest, reply: FastifyReply) => {
  try {
    await request.jwtVerify()
  } catch (err) {
    reply.status(401).send({ success: false, error: 'Unauthorized' })
  }
}

export default function (
  app: FastifyInstance,
  _: FastifyPluginOptions,
  done: DoneFuncWithErrOrRes
) {
  // Public
  app.get('/', PropertySchema.listProperties, PropertyController.listProperties)
  app.get('/transactions/recent', PropertySchema.recentTransactions, PropertyController.recentTransactions)
  app.get('/:id', PropertySchema.getProperty, PropertyController.getProperty)
  app.get('/:id/documents', PropertySchema.listDocuments, PropertyController.listDocuments)
  app.get('/:id/sla', PropertySchema.getSLA, PropertyController.getSLA)
  app.get('/:id/reports', PropertySchema.listReports, PropertyController.listReports)
  app.get('/:id/yield', PropertySchema.getYieldHistory, PropertyController.getYieldHistory)
  app.get('/:id/transactions', PropertySchema.listTransactions, PropertyController.listTransactions)
  app.get('/:id/transactions/sync', PropertySchema.syncTransactions, PropertyController.syncTransactions)

  // JWT protected
  app.post(
    '/create-full',
    { preHandler: [jwtAuth] },
    PropertyController.createPropertyFull
  )
  app.post(
    '/',
    { ...PropertySchema.createProperty, preHandler: [jwtAuth] },
    PropertyController.createProperty
  )
  app.patch(
    '/:id',
    { ...PropertySchema.updateProperty, preHandler: [jwtAuth] },
    PropertyController.updateProperty
  )
  app.post(
    '/:id/documents',
    { ...PropertySchema.uploadDocument, preHandler: [jwtAuth] },
    PropertyController.uploadDocument
  )
  app.delete(
    '/:id/documents/:docId',
    { ...PropertySchema.deleteDocument, preHandler: [jwtAuth] },
    PropertyController.deleteDocument
  )
  app.post(
    '/:id/sla',
    { ...PropertySchema.setSLA, preHandler: [jwtAuth] },
    PropertyController.setSLA
  )
  app.post(
    '/:id/reports',
    { ...PropertySchema.submitReport, preHandler: [jwtAuth] },
    PropertyController.submitReport
  )
  app.post(
    '/:id/yield/:chainId/create-tx',
    { ...PropertySchema.createYieldTx, preHandler: [jwtAuth] },
    PropertyController.createYieldTx
  )
  app.post(
    '/:id/yield/:chainId/submit',
    { ...PropertySchema.submitYieldTx, preHandler: [jwtAuth] },
    PropertyController.submitYieldTx
  )
  app.post(
    '/:id/register/:chainId/create-tx',
    { ...PropertySchema.createRegisterPropertyTx, preHandler: [jwtAuth] },
    PropertyController.createRegisterPropertyTx
  )
  app.post(
    '/:id/register/:chainId/submit',
    { ...PropertySchema.submitRegisterProperty, preHandler: [jwtAuth] },
    PropertyController.submitRegisterProperty
  )
  app.post(
    '/:id/yield-and-report/:chainId',
    { ...PropertySchema.submitYieldAndReport, preHandler: [jwtAuth] },
    PropertyController.submitYieldAndReport
  )
  app.post(
    '/:id/deploy-guard/:chainId/submit',
    { ...PropertySchema.submitDeployGuardTx, preHandler: [jwtAuth] },
    PropertyController.submitDeployGuardTx
  )
  app.post(
    '/:id/swap/:chainId/submit',
    { ...PropertySchema.submitSwapTx, preHandler: [jwtAuth] },
    PropertyController.submitSwapTx
  )

  done()
}
