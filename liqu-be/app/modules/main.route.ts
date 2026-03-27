import { DoneFuncWithErrOrRes, FastifyInstance, FastifyPluginOptions } from 'fastify'
import MainController from '#app/modules/main.controller'

export default function (app: FastifyInstance, _: FastifyPluginOptions, done: DoneFuncWithErrOrRes) {
  app.get('/', MainController.index)

  done()
}
