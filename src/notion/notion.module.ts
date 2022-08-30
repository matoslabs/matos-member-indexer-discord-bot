import { Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { HttpModule } from '@nestjs/axios'

@Module({
  imports: [ConfigModule, HttpModule],
  controllers: [],
  providers: [],
})
export class NotionModule {}
