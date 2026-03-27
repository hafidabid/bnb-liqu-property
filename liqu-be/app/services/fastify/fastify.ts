import {
  FastifyError,
  FastifyInstance,
  FastifyReply,
  FastifyRequest,
} from 'fastify'
import fastifyCors from '@fastify/cors'
import fastifyMultipart from '@fastify/multipart'
import AppException from '#app/exceptions/app_exception'
import ErrorCodes from '#app/exceptions/error_codes'
import { ContentTypeParserDoneFunction } from 'fastify/types/content-type-parser.js'
import fastifyJwt from '@fastify/jwt'
import swagger from '@fastify/swagger'
import swaggerUi from '@fastify/swagger-ui'
import AppConfig from '#app/configs/app'

const FastifyService = {
  registerCors: async (app: FastifyInstance) => {
    await app.register(fastifyCors, {
      origin: '*',
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept'],
      exposedHeaders: ['Content-Length', 'Date', 'ETag'],
      credentials: true,
    })
  },

  registerMultipart: async (app: FastifyInstance) => {
    await app.register(fastifyMultipart, {
      limits: {
        fileSize: 50 * 1024 * 1024, // 50MB
      },
    })
  },

  decorateReply: (app: FastifyInstance) => {
    app.decorateReply(
      'json',
      function (
        this: FastifyReply,
        data: object | string | number | boolean | null = null,
        status = 200,
        code: string | null = null,
        message: string | null = null
      ) {
        this.status(status).send({
          status,
          code,
          message,
          data,
        })
      }
    )
  },

  setErrorHandler: (app: FastifyInstance) => {
    app.setErrorHandler(function (
      error: FastifyError,
      request: FastifyRequest,
      reply: FastifyReply
    ) {
      if (error instanceof AppException) {
        return reply.status(error.status).send({
          status: error.status,
          code: error.code,
          message: error.message,
          data: null,
        })
      } else if (error instanceof Error) {
        if (error.code && error.code.toString().startsWith('FAST_JWT')) {
          return reply.status(401).send({
            status: 401,
            code: ErrorCodes.INVALID_CREDENTIAL,
            message: 'Invalid token credential',
            data: null,
          })
        }

        return reply.status(500).send({
          status: 500,
          code: error.code ?? 'SYSTEM_ERROR',
          message: error.message ?? 'An error occured on the system',
          data: null,
        })
      } else {
        return reply.status(500).send({
          status: 500,
          code: 'SYSTEM_ERROR',
          message: 'An error occured on the system',
          data: null,
        })
      }
    })
  },

  setErrorLogger: (app: FastifyInstance) => {
    app.addHook(
      'onResponse',
      (request: FastifyRequest, reply: FastifyReply) => {
        if (reply.statusCode > 299) {
          request.server.log.error(
            request,
            `${reply.statusCode} - ${request.ip} - request completed`
          )
        }
      }
    )
  },

  addJsonParser: (app: FastifyInstance) => {
    app.addContentTypeParser(
      'application/json',
      { parseAs: 'string' },
      function (
        request: FastifyRequest,
        body: string | Buffer<ArrayBufferLike>,
        done: ContentTypeParserDoneFunction
      ) {
        try {
          const json = JSON.parse(body as string)
          done(null, json)
        } catch (_) {
          const err = new AppException(
            400,
            ErrorCodes.PARSING_ERROR,
            'Error while parsing JSON request body'
          )
          done(err, null)
        }
      }
    )
  },

  registerJwt: async function (app: FastifyInstance) {
    await app.register(fastifyJwt, {
      sign: {
        expiresIn: AppConfig.jwt.expiresIn,
        algorithm: 'RS256',
      },
      verify: {
        algorithms: ['RS256'],
      },
      secret: {
        private: AppConfig.jwt.privateKey,
        public: AppConfig.jwt.publicKey,
      },
    })
  },

  registerSwagger: async function (app: FastifyInstance) {
    // REGISTER SWAGGER INSTANCE
    await app.register(swagger, {
      openapi: {
        openapi: '3.0.0',
        info: {
          title: 'LiquProp API',
          description: 'API Documentation for LiquProp',
          version: '0.0.1',
        },
        servers: [
          {
            url: AppConfig.app.url,
            description: 'Current Server',
          },
          {
            url: 'http://localhost:8000',
            description: 'Local Server',
          },
          {
            url: 'https://dev-api.liquprop.com',
            description: 'Development Server',
          },
          {
            url: 'https://api.liquprop.com',
            description: 'Production Server',
          },
        ],
        components: {
          securitySchemes: {
            bearerAuth: {
              type: 'http',
              scheme: 'bearer',
              bearerFormat: 'JWT',
            },
          },
        },
        security: [
          {
            bearerAuth: [],
          },
        ],
      },
    })

    // REGISTER SWAGGER UI
    await app.register(swaggerUi, {
      routePrefix: '/dokumentasi-api-app',
      uiConfig: {
        docExpansion: 'list',
        deepLinking: false,
      },
      staticCSP: true,
      transformSpecificationClone: true,
    })
  },
}

export default FastifyService
