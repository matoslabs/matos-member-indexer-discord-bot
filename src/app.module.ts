import { Module } from '@nestjs/common'
import { AppController } from './app.controller'
import { AppService } from './app.service'
import { ConfigModule } from '@nestjs/config'
import { config } from './lib/config'
import {
  WinstonModule,
  utilities as nestWinstonModuleUtilities,
} from 'nest-winston'
import * as winston from 'winston'
import { BotModule } from './bot/bot.module'

@Module({
  imports: [
    ConfigModule.forRoot({
      load: [config],
    }),
    WinstonModule.forRoot({
      transports: [
        new winston.transports.Console({
          format: winston.format.combine(
            winston.format.timestamp(),
            nestWinstonModuleUtilities.format.nestLike(),
          ),
        }),
        // other transports...
      ],
      // other options
    }),
    BotModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
