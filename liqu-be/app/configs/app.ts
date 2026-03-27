import 'dotenv/config'

const AppConfig = {
  app: {
    host: process.env.APP_HOST ?? '0.0.0.0',
    port: parseInt(process.env.APP_PORT ?? '8000'),
    url: 'http://localhost:8000',
    env: process.env.APP_ENV ?? 'local',
    frontendUrl:
      (process.env.APP_ENV ?? 'local') === 'production'
        ? 'https://app.asyah.co'
        : 'https://dev-app.asyah.co',
  },
  jwt: {
    privateKey: Buffer.from(
      process.env.JWT_PRIVATE_KEY ?? '',
      'base64'
    ).toString('utf8'),
    publicKey: Buffer.from(process.env.JWT_PUBLIC_KEY ?? '', 'base64').toString(
      'utf8'
    ),
    expiresIn: process.env.JWT_EXPIRES_IN ?? '7d',
  },
}

export default AppConfig
