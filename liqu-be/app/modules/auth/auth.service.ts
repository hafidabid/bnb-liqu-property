import { randomBytes } from 'crypto'
import { verifyMessage } from 'viem'
import { FastifyInstance } from 'fastify'
import db from '#prisma/prisma'
import AppException from '#app/exceptions/app_exception'
import ErrorCodes from '#app/exceptions/error_codes'

const AuthService = {
  /**
     * Generate a random nonce for the given wallet address.
     * Creates or updates the User record.
     */
  generateNonce: async (address: string): Promise<{ nonce: string }> => {
    const nonce = randomBytes(16).toString('hex')

    await db.user.upsert({
      where: { walletAddress: address.toLowerCase() },
      update: { nonce },
      create: { walletAddress: address.toLowerCase(), nonce },
    })

    return { nonce }
  },

  /**
     * Verify an Ethereum signature.
     * - Looks up the stored nonce for the wallet address.
     * - Verifies the signature with viem.
     * - Ensures the nonce is present in the signed message (replay protection).
     * - Issues a JWT on success and clears the nonce.
     */
  verifySignature: async (
    address: string,
    message: string,
    signature: string,
    fastify: FastifyInstance
  ): Promise<{ token: string; user: { id: number; walletAddress: string; role: string } }> => {
    const normalizedAddress = address.toLowerCase()

    const user = await db.user.findUnique({
      where: { walletAddress: normalizedAddress },
    })

    if (!user || !user.nonce) {
      throw new AppException(
        401,
        ErrorCodes.INVALID_CREDENTIAL,
        'No nonce found for this address. Request a nonce first.'
      )
    }

    // Ensure the signed message actually contains the nonce (replay protection)
    if (!message.includes(user.nonce)) {
      throw new AppException(
        401,
        ErrorCodes.INVALID_CREDENTIAL,
        'Signed message does not contain the expected nonce.'
      )
    }

    // Verify the signature using viem
    let isValid = false
    try {
      isValid = await verifyMessage({
        address: address as `0x${string}`,
        message,
        signature: signature as `0x${string}`,
      })
    } catch {
      throw new AppException(
        401,
        ErrorCodes.INVALID_CREDENTIAL,
        'Signature verification failed.'
      )
    }

    if (!isValid) {
      throw new AppException(
        401,
        ErrorCodes.INVALID_CREDENTIAL,
        'Invalid signature.'
      )
    }

    // Clear the nonce so it cannot be reused
    await db.user.update({
      where: { walletAddress: normalizedAddress },
      data: { nonce: null },
    })

    // Sign JWT
    const token = fastify.jwt.sign({
      sub: user.id.toString(),
      walletAddress: user.walletAddress,
      role: user.role,
    })

    return {
      token,
      user: { id: user.id, walletAddress: user.walletAddress, role: user.role },
    }
  },
}

export default AuthService
