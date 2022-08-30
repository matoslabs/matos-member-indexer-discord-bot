import { Injectable, OnModuleInit, Logger } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { DiscordService } from '../discord/discord.service'

@Injectable()
export class BotService implements OnModuleInit {
  private readonly logger = new Logger(BotService.name)

  constructor(
    private configService: ConfigService,
    private discord: DiscordService,
  ) {}

  async onModuleInit(): Promise<void> {
    this.logger.log(`Initializing ${BotService.name}`)
    this.initDiscordBot()
  }

  async initDiscordBot(): Promise<void> {
    await this.discord.run()
  }
}
