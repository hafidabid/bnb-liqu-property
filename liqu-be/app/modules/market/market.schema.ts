const MarketSchema = {
  getMarketStats: {
    schema: {
      description: 'Get market stats for a tokenized property',
      tags: ['market'],
      params: {
        type: 'object',
        required: ['tokenId', 'chainId'],
        properties: {
          tokenId: { type: 'string' },
          chainId: { type: 'string' },
        },
      },
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: {
              type: 'object',
              additionalProperties: true,
            },
          },
        },
      },
    },
  },

  getPriceHistory: {
    schema: {
      description: 'Get price history for a tokenized property',
      tags: ['market'],
      params: {
        type: 'object',
        required: ['tokenId', 'chainId'],
        properties: {
          tokenId: { type: 'string' },
          chainId: { type: 'string' },
        },
      },
      querystring: {
        type: 'object',
        properties: {
          range: {
            type: 'string',
            enum: ['1m', '5m', '30m', '1h', '12h', '1d', '1w', '1mo', 'all'],
            default: 'all',
          },
        },
      },
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: {
              type: 'array',
              items: { type: 'object', additionalProperties: true },
            },
          },
        },
      },
    },
  },
}

export default MarketSchema
