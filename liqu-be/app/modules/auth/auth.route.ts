import {
  DoneFuncWithErrOrRes,
  FastifyInstance,
  FastifyPluginOptions,
} from 'fastify'
import AuthController from '#app/modules/auth/auth.controller'
import { GetNonceResponse, VerifyBody, VerifyResponse } from '#app/modules/auth/auth.schema'

export default function (
  app: FastifyInstance,
  _: FastifyPluginOptions,
  done: DoneFuncWithErrOrRes
) {
  /**
     * GET /v1/auth/nonce/:address
     * Returns a fresh nonce for the given wallet address.
     * The frontend must include this nonce in the EIP-4361 message before signing.
     */
  app.get<{ Params: { address: string } }>(
    '/nonce/:address',
    {
      schema: {
        tags: ['Auth'],
        summary: 'Get a sign-in nonce for a wallet address',
        params: {
          type: 'object',
          properties: {
            address: { type: 'string', description: 'Ethereum wallet address (0x...)' },
          },
          required: ['address'],
        },
        response: GetNonceResponse,
      },
    },
    AuthController.getNonce
  )

  /**
     * POST /v1/auth/verify
     * Verifies an Ethereum signature and returns a JWT.
     *
     * Body: { address, message, signature }
     *   - address:   The signer's Ethereum address
     *   - message:   The EIP-4361 message that was signed (must include the nonce)
     *   - signature: The hex signature produced by the wallet
     */
  app.post<{
        Body: { address: string; message: string; signature: string }
    }>(
      '/verify',
      {
        schema: {
          tags: ['Auth'],
          summary: 'Verify an Ethereum signature and receive a JWT',
          body: VerifyBody,
          response: VerifyResponse,
        },
      },
      AuthController.verify
    )

  done()
}
