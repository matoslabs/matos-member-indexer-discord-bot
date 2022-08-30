import { Module } from '@nestjs/common'
import { BotService } from './bot.service'
import { ConfigModule } from '@nestjs/config'
import { HttpModule } from '@nestjs/axios'
import { DiscordModule } from '../discord/discord.module'

@Module({
  imports: [ConfigModule, HttpModule, DiscordModule],
  controllers: [],
  providers: [BotService],
})
export class BotModule {}
