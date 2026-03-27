const SwapSchema = {
  createSwapTx: {
    schema: {
      description: 'Create a swap transaction',
      tags: ['swap'],
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
          token0: { type: 'string' },
          zeroForOne: { type: 'boolean' },
          amountIn: { type: 'number' },
          amountOut: { type: 'number' },
          deadline: { type: 'number' },
        },
        required: [
          'from',
          'token0',
          'zeroForOne',
          'amountIn',
          'amountOut',
          'deadline',
        ],
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
  submitSwapTx: {
    schema: {
      description: 'Submit a swap transaction',
      tags: ['swap'],
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
}

export default SwapSchema
