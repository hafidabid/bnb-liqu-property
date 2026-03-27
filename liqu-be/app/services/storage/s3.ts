import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3'

const region = process.env.AWS_REGION ?? 'us-east-1'
const endpoint = process.env.S3_ENDPOINT || undefined

const s3 = new S3Client({
  region,
  endpoint,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID ?? '',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY ?? '',
  },
  forcePathStyle: !!endpoint,
})

export const uploadFile = async (
  buffer: Buffer,
  key: string,
  contentType: string
): Promise<string> => {
  const bucket = process.env.S3_BUCKET_NAME ?? ''

  await s3.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: buffer,
      ContentType: contentType,
    })
  )

  // Custom public URL base (e.g. CDN or R2 public domain)
  const publicUrl = process.env.S3_PUBLIC_URL
  if (publicUrl) {
    return `${publicUrl}/${key}`
  }

  // S3-compatible endpoint (MinIO, R2, etc.)
  if (endpoint) {
    return `${endpoint}/${bucket}/${key}`
  }

  // Standard AWS S3
  return `https://${bucket}.s3.${region}.amazonaws.com/${key}`
}
