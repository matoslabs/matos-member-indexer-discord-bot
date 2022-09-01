export enum NotionPropertyIds {
  DISCORD_ID = 'title',
  USERNAME = 'Vl%3CE',
  USERNAME_FOUR_DIGITS = 'fG~f',
  BIO_DESCRIPTION = 'qCLL',
}

export type NotionDiscordUser = {
  discordId: string
  notionPageId: string
  name: string
  value: string
}
