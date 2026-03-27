import { FastifyReply, FastifyRequest } from 'fastify'

const MainController = {
  index: function (request: FastifyRequest, reply: FastifyReply) {
    reply.json({ health: 'ok' })
  }
}

export default MainController
