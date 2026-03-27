const FactorySchema = {
  createDeployGuardTx: {
    schema: {
      description: 'Create a deploy guard transaction',
      tags: ['factory'],
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
          from: { type: 'string' },
          name: { type: 'string' },
          symbol: { type: 'string' },
          tokenId: { type: 'number' },
          price: { type: 'number' },
          floorPrice: { type: 'number' },
        },
        required: ['from', 'name', 'symbol', 'tokenId', 'price', 'floorPrice'],
      },
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            tx: {
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
  submitDeployGuardTx: {
    schema: {
      description: 'Submit a deploy guard transaction',
      tags: ['factory'],
      params: {
        type: 'object',
        properties: {
          chainId: { type: 'string' },
        },
        required: ['chainId'],
      },
      body: {
        type: 'object',
        properties: { tx: { type: 'string' } },
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
}

export default FactorySchema
