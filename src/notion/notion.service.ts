import { Injectable, OnModuleInit, Logger } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { DiscordUser } from '../discord/discord.types'
import { Client } from '@notionhq/client'
import { NotionPropertyIds } from './notion.types'

@Injectable()
export class NotionService implements OnModuleInit {
  private readonly logger = new Logger(NotionService.name)
  private client: Client
  private databaseId: string

  constructor(private configService: ConfigService) {
    const auth = this.configService.get<string>('notion.accessToken')
    this.databaseId = this.configService.get<string>('notion.databaseId')
    this.client = new Client({ auth })
  }

  async onModuleInit(): Promise<void> {
    this.logger.log(`Initializing ${NotionService.name}`)
  }

  async addFieldToNotion(discordUser: DiscordUser): Promise<void> {
    const database_id = this.databaseId
    try {
      const response = await this.client.pages.create({
        parent: {
          database_id,
        },
        properties: {
          ID: {
            type: 'title',
            title: [
              {
                type: 'text',
                text: {
                  content: discordUser.id,
                },
              },
            ],
          },
          username: {
            type: 'rich_text',
            rich_text: [
              {
                type: 'text',
                text: {
                  content: discordUser.username,
                },
              },
            ],
          },
          usernameFourDigits: {
            type: 'rich_text',
            rich_text: [
              {
                type: 'text',
                text: {
                  content: discordUser.usernameFourDigits,
                },
              },
            ],
          },
          bioDescription: {
            type: 'rich_text',
            rich_text: [
              {
                type: 'text',
                text: {
                  content: discordUser.bioDescription,
                },
              },
            ],
          },
        },
      })
      this.logger.log(
        `Added biography: ${discordUser.bioDescription} for ${discordUser.username}`,
      )
    } catch (error) {
      this.logger.error(error.body)
    }
  }

  async listTableItems(): Promise<any[]> {
    this.logger.log('Listing table items...')
    const database_id = this.databaseId
    try {
      const databasePages = await this.client.databases.query({
        database_id,
        sorts: [
          {
            property: 'username',
            direction: 'ascending',
          },
        ],
      })
      this.logger.log(databasePages)

      const users = databasePages.results.map(async (page) => {
        const usernameRequest = this.client.pages.properties.retrieve({
          page_id: page.id,
          property_id: NotionPropertyIds.USERNAME,
        })
        const usernameFourDigitsRequest = this.client.pages.properties.retrieve(
          {
            page_id: page.id,
            property_id: NotionPropertyIds.USERNAME_FOUR_DIGITS,
          },
        )
        const bioDescriptionRequest = this.client.pages.properties.retrieve({
          page_id: page.id,
          property_id: NotionPropertyIds.BIO_DESCRIPTION,
        })

        const [
          usernameResponse,
          usernameFourDigitsResponse,
          bioDescriptionResponse,
        ] = await Promise.all([
          usernameRequest,
          usernameFourDigitsRequest,
          bioDescriptionRequest,
        ])

        const username = (usernameResponse as any).results[0].rich_text
          .plain_text
        const usernameFourDigits = (usernameFourDigitsResponse as any)
          .results[0].rich_text.plain_text
        const bioDescription = (bioDescriptionResponse as any).results[0]
          .rich_text.plain_text

        return {
          name: `${username}#${usernameFourDigits}`,
          value: bioDescription,
        }
      })

      return await Promise.all(users)
    } catch (e) {
      this.logger.error(e)
    }
  }
}
