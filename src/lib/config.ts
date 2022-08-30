export const config = () => ({
  port: parseInt(process.env.PORT, 10) || 3000,
  discord: {
    token: process.env.DISCORD_TOKEN,
    clientId: process.env.DISCORD_CLIENT_ID,
  },
  notion: {
    accessToken: process.env.NOTION_ACCESS_TOKEN,
    databaseId: process.env.NOTION_DATABASE_ID,
  },
})
