import { FastifyReply, FastifyRequest } from 'fastify'
import { uploadFile } from '#app/services/storage/s3'
import prisma from '#prisma/prisma'
import { DocumentType } from '@prisma/client'

const ALLOWED_TYPES = new Set<string>([
    'IMAGE',
    'LEGAL_TITLE',
    'LEGAL_REGISTRATION',
    'PROSPECTUS',
    'OTHER',
])

const AssetsController = {
    upload: async (request: FastifyRequest, reply: FastifyReply) => {
        try {
            const user = (request as any).user as { walletAddress: string }

            const parts = (request as any).parts()
            let type: DocumentType = 'OTHER'
            let buffer: Buffer | null = null
            let fileName = 'upload'
            let contentType = 'application/octet-stream'

            for await (const part of parts) {
                if (part.type === 'field') {
                    if (part.fieldname === 'type' && ALLOWED_TYPES.has(part.value)) {
                        type = part.value as DocumentType
                    }
                } else if (part.type === 'file') {
                    fileName = part.filename || fileName
                    contentType = part.mimetype || contentType
                    const chunks: Buffer[] = []
                    for await (const chunk of part.file) {
                        chunks.push(chunk)
                    }
                    buffer = Buffer.concat(chunks)
                }
            }

            if (!buffer) {
                return reply.status(400).send({ success: false, error: 'No file provided' })
            }

            const key = `assets/temp/${user.walletAddress.toLowerCase()}/${Date.now()}-${fileName}`
            const url = await uploadFile(buffer, key, contentType)

            const doc = await (prisma.propertyDocument.create as any)({
                data: {
                    // propertyId is null — orphan, will be linked in createPropertyFull
                    // Prisma types will reflect this after migration + prisma generate
                    type,
                    fileName,
                    url,
                },
            })

            reply.status(200).send({ success: true, data: doc })
        } catch (error: any) {
            reply.status(400).send({ success: false, error: error.message })
        }
    },
}

export default AssetsController
