import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify'

import MainRoute from '#app/modules/main.route'
import AdminRoute from '#app/modules/admin/admin.route'
import MintRoute from '#app/modules/mint/mint.route'
import MiscRoute from '#app/modules/miscallenous/misc.route'
import PresaleRoute from '#app/modules/presale/presale.route'
import FactoryRoute from '#app/modules/factory/factory.route'
import SwapRoute from '#app/modules/swap/swap.route'
import AuthRoute from '#app/modules/auth/auth.route'
import ChainRoute from '#app/modules/chain/chain.route'
import RpcRoute from '#app/modules/chain/rpc.route'
import PropertyRoute from '#app/modules/property/property.route'
import SubscriptionRoute from '#app/modules/subscription/subscription.route'
import IndexerRoute from '#app/modules/indexer/indexer.route'
import PropertyController from '#app/modules/property/property.controller'
import PropertySchema from '#app/modules/property/property.schema'
import MarketRoute from '#app/modules/market/market.route'
import PortfolioRoute from '#app/modules/portfolio/portfolio.route'

const jwtAuth = async (request: FastifyRequest, reply: FastifyReply) => {
  try {
    await request.jwtVerify()
  } catch {
    reply.status(401).send({ success: false, error: 'Unauthorized' })
  }
}

export default function (app: FastifyInstance) {
  app.register(MainRoute)
  app.register(AuthRoute, { prefix: '/auth' })
  app.register(ChainRoute, { prefix: '/chains' })
  app.register(RpcRoute, { prefix: '/rpc' })
  app.register(AdminRoute)
  app.register(MintRoute, { prefix: '/mint' })
  app.register(MiscRoute)
  app.register(PresaleRoute)
  app.register(FactoryRoute)
  app.register(SwapRoute)
  app.register(PropertyRoute, { prefix: '/properties' })
  app.register(SubscriptionRoute, { prefix: '/subscription' })
  app.register(IndexerRoute, { prefix: '/indexer' })
  app.register(MarketRoute, { prefix: '/market' })
  app.register(PortfolioRoute, { prefix: '/portfolio' })

  // Root-level property registration routes (matching existing mint pattern)
  app.post(
    '/create-register-property-tx',
    { ...PropertySchema.createRegisterPropertyTx, preHandler: [jwtAuth] },
    PropertyController.createRegisterPropertyTx
  )
  app.post(
    '/submit-register-property',
    { ...PropertySchema.submitRegisterProperty, preHandler: [jwtAuth] },
    PropertyController.submitRegisterProperty
  )
  // My properties (root-level to avoid conflict with /:id route)
  app.get(
    '/my/properties',
    { ...PropertySchema.getMyProperties, preHandler: [jwtAuth] },
    PropertyController.getMyProperties
  )
}
