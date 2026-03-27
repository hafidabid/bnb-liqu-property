const PortfolioSchema = {
  getPortfolio: {
    schema: {
      description: 'Get investor portfolio (JWT protected)',
      tags: ['portfolio'],
      security: [{ bearerAuth: [] }],
      params: {
        type: 'object',
        required: ['chainId'],
        properties: {
          chainId: { type: 'string' },
        },
      },
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: { type: 'object', additionalProperties: true },
          },
        },
      },
    },
  },

  createClaimYieldTx: {
    schema: {
      description: 'Build unsigned claim-yield transaction (JWT protected)',
      tags: ['portfolio'],
      security: [{ bearerAuth: [] }],
      params: {
        type: 'object',
        required: ['chainId'],
        properties: {
          chainId: { type: 'string' },
        },
      },
      body: {
        type: 'object',
        required: ['tokenId'],
        properties: {
          tokenId: { type: 'string' },
        },
      },
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: { type: 'object', additionalProperties: true },
          },
        },
      },
    },
  },

  submitClaimYieldTx: {
    schema: {
      description: 'Submit signed claim-yield transaction (JWT protected)',
      tags: ['portfolio'],
      security: [{ bearerAuth: [] }],
      params: {
        type: 'object',
        required: ['chainId'],
        properties: {
          chainId: { type: 'string' },
        },
      },
      body: {
        type: 'object',
        required: ['tokenId', 'tx'],
        properties: {
          tokenId: { type: 'string' },
          tx: { type: 'string' },
        },
      },
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: { type: 'object', additionalProperties: true },
          },
        },
      },
    },
  },
}

export default PortfolioSchema
