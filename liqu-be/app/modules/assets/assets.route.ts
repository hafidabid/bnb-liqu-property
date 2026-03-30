import {
    DoneFuncWithErrOrRes,
    FastifyInstance,
    FastifyPluginOptions,
    FastifyReply,
    FastifyRequest,
} from 'fastify'
import AssetsController from './assets.controller.js'

const jwtAuth = async (request: FastifyRequest, reply: FastifyReply) => {
    try {
        await request.jwtVerify()
    } catch (err) {
        reply.status(401).send({ success: false, error: 'Unauthorized' })
    }
}

export default function (
    app: FastifyInstance,
    _: FastifyPluginOptions,
    done: DoneFuncWithErrOrRes
) {
    // POST /v1/assets/upload  — upload a file before a property exists
    app.post(
        '/upload',
        { preHandler: [jwtAuth] },
        AssetsController.upload
    )

    done()
}
