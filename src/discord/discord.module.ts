import { HttpModule } from '@nestjs/axios'
import { Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { NotionModule } from '../notion/notion.module'
import { NotionService } from '../notion/notion.service'
import { DiscordService } from './discord.service'

@Module({
  imports: [HttpModule, ConfigModule, NotionModule],
  controllers: [],
  providers: [DiscordService, NotionService],
  exports: [DiscordService],
})
export class DiscordModule {}
