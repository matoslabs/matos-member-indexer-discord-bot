import {
  Client,
  REST,
  Routes,
  GatewayIntentBits,
  Interaction,
  CacheType,
  EmbedBuilder,
} from 'discord.js'
import { Injectable, Logger } from '@nestjs/common'
import {
  DiscordCommandNames,
  discordCommandOptions,
  discordCommands,
} from './discord.commands'
import { ConfigService } from '@nestjs/config'
import { NotionService } from '../notion/notion.service'
import { DiscordUser } from './discord.types'
import { NotionDiscordUser } from '../notion/notion.types'

@Injectable()
export class DiscordService {
  private readonly logger = new Logger(DiscordService.name)
  private client: Client = new Client({
    intents: [GatewayIntentBits.Guilds],
  })

  constructor(
    private configService: ConfigService,
    private notionService: NotionService,
  ) {}

  async reportError(
    error: Error,
    interaction: Interaction<CacheType>,
  ): Promise<void> {
    this.logger.error(error)
    if (!interaction.isCommand()) return

    await interaction.reply(`❌ Something went wrong: ${error.message}.`)
  }

  async run(): Promise<void> {
    this.logger.log('Started DiscordService...')
    const token = this.configService.get<string>('discord.token')
    await this.registerSlashCommands()
    this.logger.log('🤖 DiscordBot is ready to receive commands. 🤖')
    this.client.login(token)
    await this.addListeners()
  }

  async registerSlashCommands(): Promise<void> {
    const token = this.configService.get<string>('discord.token')
    const rest = new REST({ version: '10' }).setToken(token)

    try {
      this.logger.log('Started refreshing application (/) commands.')
      await rest.put(
        Routes.applicationCommands(
          this.configService.get<string>('discord.clientId'),
        ),
        { body: discordCommands },
      )

      this.logger.log('Successfully reloaded application (/) commands.')
    } catch (error) {
      this.logger.error(error)
    }
  }

  async addListeners(): Promise<void> {
    this.client.on('interactionCreate', async (interaction) => {
      try {
        if (!interaction.isCommand()) return

        if (interaction.commandName === DiscordCommandNames.BIO) {
          const userId = interaction.user.id
          const username = interaction.user.username
          const usernameFourDigits = interaction.user.discriminator
          // eslint-disable-next-line @typescript-eslint/ban-ts-comment
          // @ts-ignore
          const bioDescription = interaction.options.getString(
            discordCommandOptions.BIO_DESCRIPTION,
          )

          const discordUser: DiscordUser = {
            id: userId,
            username,
            usernameFourDigits,
            bioDescription,
          }

          if (this.notionService.userExists(userId)) {
            const successful = await this.notionService.updateNotionField(
              discordUser,
            )

            if (successful) {
              await interaction.reply(
                `✅ Updated ${username}#${usernameFourDigits} biography .`,
              )
            } else {
              await interaction.reply(`😭 Something went wrong updating!`)
            }
          } else {
            await this.notionService.addFieldToNotion(discordUser)
            await interaction.reply(
              `✅ Added ${username}#${usernameFourDigits} into the biography list of Matos members.`,
            )
          }
        }

        if (interaction.commandName === DiscordCommandNames.LIST_MEMBERS) {
          const discordUsers = await this.notionService.listTableItems()
          const embedMessages = this.buildEmbedMessage(discordUsers)

          await interaction.reply({ embeds: embedMessages })
        }
      } catch (e) {
        await this.reportError(e, interaction)
      }
    })
  }

  buildEmbedMessage(discordUsers: NotionDiscordUser[]): EmbedBuilder[] {
    const embedMessages = discordUsers.map((discordUser) => {
      return new EmbedBuilder()
        .setColor(0x0099ff)
        .setTitle(discordUser.name)
        .setDescription(discordUser.value)
    })

    return embedMessages
  }
}
