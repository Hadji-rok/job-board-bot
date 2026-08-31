require('dotenv').config();
const { REST, Routes } = require('discord.js');
const postJob = require('./commands/postJob');
const closeJob = require('./commands/closeJob');
const forceRelease = require('./commands/forceRelease');
const ticketConfig = require('./commands/ticketConfig');
const ticketType = require('./commands/ticketType');
const ticketPanel = require('./commands/ticketPanel');
const shift = require('./commands/shift');
const myStats = require('./commands/myStats');

const commands = [
  postJob.data.toJSON(),
  closeJob.data.toJSON(),
  forceRelease.data.toJSON(),
  ticketConfig.data.toJSON(),
  ticketType.data.toJSON(),
  ticketPanel.data.toJSON(),
  shift.data.toJSON(),
  myStats.data.toJSON(),
];

const rest = new REST().setToken(process.env.DISCORD_TOKEN);

(async () => {
  try {
    const route = process.env.DISCORD_GUILD_ID
      ? Routes.applicationGuildCommands(process.env.DISCORD_CLIENT_ID, process.env.DISCORD_GUILD_ID)
      : Routes.applicationCommands(process.env.DISCORD_CLIENT_ID);

    console.log(`Registering ${commands.length} command(s)...`);
    await rest.put(route, { body: commands });
    console.log('Commands registered successfully.');
  } catch (err) {
    console.error(err);
  }
})();
