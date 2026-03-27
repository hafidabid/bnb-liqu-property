import { FastifyRequest, FastifyReply } from 'fastify'
import AuthService from './auth.service.js'

const AuthController = {
  getNonce: async (
    request: FastifyRequest<{ Params: { address: string } }>,
    reply: FastifyReply
  ) => {
    const { address } = request.params
    const data = await AuthService.generateNonce(address)

    return reply.json(data)
  },

  verify: async (
    request: FastifyRequest<{
            Body: { address: string; message: string; signature: string }
        }>,
    reply: FastifyReply
  ) => {
    const { address, message, signature } = request.body
    const data = await AuthService.verifySignature(address, message, signature, request.server)

    return reply.json(data)
  },
}

export default AuthController
