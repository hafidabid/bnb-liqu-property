export const GetNonceResponse = {
  200: {
    type: 'object',
    properties: {
      status: { type: 'number' },
      code: { type: 'string', nullable: true },
      message: { type: 'string', nullable: true },
      data: {
        type: 'object',
        properties: {
          nonce: { type: 'string' },
        },
      },
    },
  },
}

export const VerifyBody = {
  type: 'object',
  required: ['address', 'message', 'signature'],
  properties: {
    address: { type: 'string', description: 'Ethereum wallet address (0x...)' },
    message: { type: 'string', description: 'EIP-4361 signed message containing the nonce' },
    signature: { type: 'string', description: 'Hex-encoded signature from the wallet' },
  },
}

export const VerifyResponse = {
  200: {
    type: 'object',
    properties: {
      status: { type: 'number' },
      code: { type: 'string', nullable: true },
      message: { type: 'string', nullable: true },
      data: {
        type: 'object',
        properties: {
          token: { type: 'string', description: 'JWT to use as Bearer token' },
          user: {
            type: 'object',
            properties: {
              id: { type: 'number' },
              walletAddress: { type: 'string' },
              role: { type: 'string', enum: ['ADMIN', 'USER'] },
            },
          },
        },
      },
    },
  },
}
