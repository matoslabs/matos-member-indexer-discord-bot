import {
  Client,
  REST,
  Routes,
  Interaction,
  CacheType,
  Partials,
  GatewayIntentBits,
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

@Injectable()
export class DiscordService {
  private readonly logger = new Logger(DiscordService.name)
  private lastMessageId
  private client: Client = new Client({
    intents: [GatewayIntentBits.Guilds],
    partials: [Partials.Channel, Partials.Message],
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

    this.client.on('ready', () => {
      this.addListeners()
    })
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
    this.createInitial()
    this.client.on('interactionCreate', async (interaction) => {
      try {
        if (!interaction.isCommand()) return

        if (interaction.commandName === DiscordCommandNames.BIO) {
          const role = interaction.guild.roles.cache.find(
            (role) => role.name === 'club',
          )
          const hasRole = (interaction.member.roles as any).cache.has(role.id)
          if (!hasRole) {
            await interaction.reply({
              content: `❌ only for @club members`,
              ephemeral: true,
            })

            return
          }

          const userId = interaction.user.id
          const username = interaction.user.username
          const usernameFourDigits = interaction.user.discriminator
          // eslint-disable-next-line @typescript-eslint/ban-ts-comment
          // @ts-ignore
          const bioDescription = interaction.options.getString(
            discordCommandOptions.BIO_DESCRIPTION,
          )

          if (bioDescription.length > 200) {
            await interaction.reply({
              content: `❌ to long didnt read. Make it shorter (max 200 chars)`,
              ephemeral: true,
            })
            return
          }

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

            this.updateSelectedMessage()
            if (successful) {
              await interaction.reply({
                content: `✅ Updated`,
                ephemeral: true,
              })
            } else {
              await interaction.reply({
                content: `😭 Something went wrong updating!`,
                ephemeral: true,
              })
            }
          } else {
            await this.notionService.addFieldToNotion(discordUser)
            await interaction.reply({
              content: `✅ Added ${username}#${usernameFourDigits} into the biography list of Matos members.`,
              ephemeral: true,
            })
            this.updateSelectedMessage()
          }
        }
      } catch (e) {
        await this.reportError(e, interaction)
      }
    })
  }

  async createInitial() {
    const channelId = this.configService.get<string>('CHANNEL_ID')
    const channel = (await this.client.channels.fetch(channelId)) as any
    const msg = await channel.send('...')
    this.lastMessageId = msg.id
    this.updateSelectedMessage()
  }

  async updateSelectedMessage(): Promise<void> {
    const _channel = (await this.client.channels.fetch(
      this.configService.get<string>('CHANNEL_ID'),
    )) as any
    const msg = await _channel.messages.fetch(this.lastMessageId)
    const discordUsers = await this.notionService.listTableItems()
    const message = discordUsers
      .map(
        (discordUser) =>
          `<@${discordUser.discordId}> - ${discordUser.value} \n`,
      )
      .join('')
    await msg.edit(message)
  }
}
