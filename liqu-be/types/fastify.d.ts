import 'fastify'
import { Role } from '@prisma/client'

declare module 'fastify' {
  interface FastifyReply {
    json: (data?: object | string | number | boolean | null, status?: number, code?: string | null, message?: string | null) => void
  }
}

declare module '@fastify/jwt' {
  interface FastifyJWT {
    payload: {
      sub: string
      walletAddress: string
      role: Role
    }
    user: {
      id: number
      walletAddress: string
      role: Role
    }
  }
}
