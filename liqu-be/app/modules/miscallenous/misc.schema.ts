const MiscSchema = {
  approveMintPrinciple: {
    schema: {
      description: 'Approve a mint principle',
      tags: ['misc'],
      params: {
        type: 'object',
        properties: {
          chainId: { type: 'string' },
        },
        required: ['chainId'],
      },
      body: {
        type: 'object',
        properties: {
          tokenId: {
            type: 'number',
            description: 'The token id of the principle',
          },
        },
        required: ['tokenId'],
      },
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            tx: { type: 'string' },
          },
        },
      },
    },
  },
  dealUSDC: {
    schema: {
      description: 'Deal USDC',
      tags: ['misc'],
      params: {
        type: 'object',
        properties: {
          chainId: { type: 'string' },
        },
        required: ['chainId'],
      },
      body: {
        type: 'object',
        properties: {
          amount: { type: 'number' },
          to: { type: 'string' },
        },
        required: ['amount', 'to'],
      },
      response: {
        200: {
          type: 'object',
          properties: { success: { type: 'boolean' }, tx: { type: 'string' } },
        },
        500: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            error: { type: 'string' },
          },
        },
      },
    },
  },
}

export default MiscSchema
