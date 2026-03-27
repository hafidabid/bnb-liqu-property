const SubscriptionSchema = {
  setSubscription: {
    schema: {
      description: 'Create or switch subscription plan for a property',
      tags: ['subscription'],
      security: [{ bearerAuth: [] }],
      body: {
        type: 'object',
        required: ['propertyId', 'plan'],
        properties: {
          propertyId: { type: 'string' },
          plan: { type: 'string', enum: ['MONTHLY', 'YIELD_PERCENTAGE'] },
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
  getSubscription: {
    schema: {
      description: 'Get subscription status for a property',
      tags: ['subscription'],
      security: [{ bearerAuth: [] }],
      params: {
        type: 'object',
        required: ['propertyId'],
        properties: {
          propertyId: { type: 'string' },
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
  extendSubscription: {
    schema: {
      description: 'Admin: extend monthly subscription by N days',
      tags: ['subscription'],
      security: [{ bearerAuth: [] }],
      params: {
        type: 'object',
        required: ['propertyId'],
        properties: {
          propertyId: { type: 'string' },
        },
      },
      body: {
        type: 'object',
        properties: {
          days: { type: 'number', default: 30 },
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

export default SubscriptionSchema
