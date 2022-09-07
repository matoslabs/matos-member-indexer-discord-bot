import { CommandInteraction, SlashCommandBuilder } from 'discord.js'

export type InterAction = CommandInteraction

export enum DiscordCommandNames {
  BIO = 'bio',
  LIST_MEMBERS = 'list-members',
}

export enum DiscordCommandDescription {
  BIO = 'Add or update your biography in the list. Only for @club members and max 200 chars',
  LIST_MEMBERS = 'Show the biography of all the registered Matos members.',
}

export const discordCommandOptions = {
  BIO_DESCRIPTION: 'description',
}

const addBioCommand = new SlashCommandBuilder()
  .setName(DiscordCommandNames.BIO)
  .setDescription(DiscordCommandDescription.BIO)
  .addStringOption((option) =>
    option
      .setName(discordCommandOptions.BIO_DESCRIPTION)
      .setRequired(true)
      .setDescription('Your own biography.'),
  )

const listMembersCommand = new SlashCommandBuilder()
  .setName(DiscordCommandNames.LIST_MEMBERS)
  .setDescription(DiscordCommandDescription.LIST_MEMBERS)

export const discordCommands = [
  addBioCommand.toJSON(),
  // listMembersCommand.toJSON(),
]
