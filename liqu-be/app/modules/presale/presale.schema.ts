export const presaleSchema = {
  createPresaleTx: {
    schema: {
      description: 'Create a presale transaction',
      tags: ['presale'],
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
          from: {
            type: 'string',
            description: 'The address to create the presale transaction from',
          },
          tokenId: {
            type: 'number',
            description: 'The token id to buy the presale for',
          },
          amount: {
            type: 'number',
            description: 'The amount of USDC to buy the presale for',
          },
        },
        required: ['from', 'tokenId', 'amount'],
      },
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: {
              type: 'object',
              properties: {
                to: { type: 'string' },
                from: { type: 'string' },
                data: { type: 'string' },
                nonce: { type: 'number' },
                gas: { type: 'number' },
                maxFeePerGas: { type: 'number' },
                maxPriorityFeePerGas: { type: 'number' },
              },
            },
          },
        },
      },
    },
  },
  submitPresaleTx: {
    schema: {
      description: 'Submit a presale transaction',
      tags: ['presale'],
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
          tx: { type: 'string' },
        },
        required: ['tx'],
      },
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            txHash: { type: 'string' },
          },
        },
      },
    },
  },
  approveUSDCPresale: {
    schema: {
      description: 'Approve USDC for presale',
      tags: ['presale'],
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
        },
        required: ['amount'],
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
}

export default presaleSchema
