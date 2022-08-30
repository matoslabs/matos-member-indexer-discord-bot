import { ConfigService } from '@nestjs/config'
import { NestFactory } from '@nestjs/core'
import { WinstonModule } from 'nest-winston'
import * as winston from 'winston'
import { AppModule } from './app.module'

const { format, transports } = winston
const { combine, splat, timestamp, printf } = format

const customLogFormat = printf(({ level, message, timestamp, ...metadata }) => {
  let msg = `${timestamp} [${level}] : ${message} `
  if (metadata) {
    msg += JSON.stringify(metadata)
  }
  return msg
})

const WinstonLogger = WinstonModule.createLogger({
  level: 'debug',
  format: combine(format.colorize(), splat(), timestamp(), customLogFormat),
  transports: [
    new transports.Console({ level: 'info' }),
    new transports.File({
      filename: 'logfile.log',
      level: 'debug',
    }),
  ],
})

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    logger: WinstonLogger,
  })
  const configService = app.get(ConfigService)
  const port = configService.get<number>('port')
  await app.listen(port, () => {
    WinstonLogger.log(`🚀 Server ready at: http://localhost:${port} 🚀`)
  })
}
bootstrap()
