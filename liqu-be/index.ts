import 'dotenv/config'
import Fastify from 'fastify'
import routes from '#app/routes/index'
import FastifyService from '#app/services/fastify/fastify'
import logger from '#app/services/pino/logger'
import { startIndexerCronJobs } from './app/modules/indexer/indexer.cron.js'
import { startMarketPriceCronJobs } from './app/modules/market/market.cron.js'
import { startPortfolioCronJobs } from './app/modules/portfolio/portfolio.cron.js'

  // Patch BigInt to be serializable by JSON.stringify
  ; (BigInt.prototype as any).toJSON = function () {
    return this.toString()
  }
const fastify = Fastify({
  logger: {
    level: 'info',
    transport: {
      target: 'pino-pretty',
      options: {
        colorize: true,
        translateTime: 'yyyy-mm-dd HH:MM:ss.l',
      },
    },
  },
})

const start = async () => {
  try {
    FastifyService.decorateReply(fastify)
    FastifyService.setErrorHandler(fastify)
    FastifyService.setErrorLogger(fastify)
    FastifyService.addJsonParser(fastify)

    await FastifyService.registerCors(fastify)
    await FastifyService.registerMultipart(fastify)
    await FastifyService.registerJwt(fastify)
    await FastifyService.registerSwagger(fastify)
    await fastify.register(routes)
    await fastify.ready()

    const port: number = Number.parseInt(process.env.APP_PORT ?? '8000')
    await fastify.listen({
      port: port,
      host: process.env.APP_HOST,
    })

    // Start indexer sync cron jobs after application starts listening
    startIndexerCronJobs()
    startMarketPriceCronJobs()
    startPortfolioCronJobs()
  } catch (error) {
    logger.error(error, 'Error starting server: ')
    process.exit(1)
  }
}

start()
