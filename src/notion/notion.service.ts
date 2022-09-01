import { Injectable, OnModuleInit, Logger } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { DiscordUser } from '../discord/discord.types'
import { Client } from '@notionhq/client'
import { NotionDiscordUser, NotionPropertyIds } from './notion.types'

const getTextFromNotionTable = (tableDataItem: any): string =>
  tableDataItem.results[0].rich_text.plain_text

@Injectable()
export class NotionService implements OnModuleInit {
  private readonly logger = new Logger(NotionService.name)
  private client: Client
  private localCacheUsers: NotionDiscordUser[]
  private databaseId: string

  constructor(private configService: ConfigService) {
    const auth = this.configService.get<string>('notion.accessToken')
    this.databaseId = this.configService.get<string>('notion.databaseId')
    this.client = new Client({ auth })
  }

  async onModuleInit(): Promise<void> {
    this.logger.log(`Initializing ${NotionService.name}`)
    this.localCacheUsers = await this.listTableItems()
  }

  userExists(discordId: string): boolean {
    return this.localCacheUsers.some((user) => user.discordId === discordId)
  }

  async updateNotionField(discordUser: DiscordUser): Promise<boolean> {
    const cachedUser = this.localCacheUsers.find(
      (user) => user.discordId === discordUser.id,
    )
    if (!cachedUser) {
      this.logger.error(`User ${discordUser.id} not found in cache`)
      return
    }
    try {
      await this.client.pages.update({
        page_id: cachedUser.notionPageId,
        properties: {
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
      this.logger.log(`Updated biography for user ${discordUser.username}`)
      await this.listTableItems(true)
      return true
    } catch (error) {
      this.logger.error(error)
      return false
    }
  }

  async addFieldToNotion(discordUser: DiscordUser): Promise<void> {
    const database_id = this.databaseId
    try {
      await this.client.pages.create({
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
      await this.listTableItems(true)
    } catch (error) {
      this.logger.error(error.body)
    }
  }

  async listTableItems(invalidateCache = false): Promise<NotionDiscordUser[]> {
    this.logger.log('Listing table items...')
    if (this.localCacheUsers && !invalidateCache) {
      this.logger.log('Returning cached users')
      return this.localCacheUsers
    }

    this.logger.log('♻️  Fetching users from Notion...')

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

      const users = databasePages.results.map(async (page) => {
        const discordIdRequest = this.client.pages.properties.retrieve({
          page_id: page.id,
          property_id: NotionPropertyIds.DISCORD_ID,
        })

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
          discordIdRequestResponse,
          usernameResponse,
          usernameFourDigitsResponse,
          bioDescriptionResponse,
        ] = await Promise.all([
          discordIdRequest,
          usernameRequest,
          usernameFourDigitsRequest,
          bioDescriptionRequest,
        ])

        const discordId = (discordIdRequestResponse as any).results[0].title
          .plain_text
        const username = getTextFromNotionTable(usernameResponse)
        const usernameFourDigits = getTextFromNotionTable(
          usernameFourDigitsResponse,
        )
        const bioDescription = getTextFromNotionTable(bioDescriptionResponse)

        return {
          discordId: discordId,
          notionPageId: page.id, // Used to know which row and column to update
          name: `${username}#${usernameFourDigits}`,
          value: bioDescription,
        }
      })

      const notionUsers = await Promise.all(users)
      this.localCacheUsers = notionUsers
      return notionUsers
    } catch (e) {
      this.logger.error(e)
    }
  }
}
