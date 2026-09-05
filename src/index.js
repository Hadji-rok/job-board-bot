require('dotenv').config();
const { Client, GatewayIntentBits, Collection } = require('discord.js');
const postJob = require('./commands/postJob');
const closeJob = require('./commands/closeJob');
const forceRelease = require('./commands/forceRelease');
const ticketConfig = require('./commands/ticketConfig');
const ticketType = require('./commands/ticketType');
const ticketPanel = require('./commands/ticketPanel');
const jobConfig = require('./commands/jobConfig');
const shift = require('./commands/shift');
const myStats = require('./commands/myStats');
const { handleJobButton } = require('./handlers/jobButtons');
const { handleTicketSelect } = require('./handlers/ticketSelect');
const { handleTicketButton } = require('./handlers/ticketClose');
const { handleTicketFormSubmit } = require('./handlers/ticketFormSubmit');
const { handleJobPanelButton, handleJobModalSubmit } = require('./handlers/jobPanel');
const { startExpiryChecker } = require('./expiryChecker');

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers],
});

client.commands = new Collection();
client.commands.set(postJob.data.name, postJob);
client.commands.set(closeJob.data.name, closeJob);
client.commands.set(forceRelease.data.name, forceRelease);
client.commands.set(ticketConfig.data.name, ticketConfig);
client.commands.set(ticketType.data.name, ticketType);
client.commands.set(ticketPanel.data.name, ticketPanel);
client.commands.set(jobConfig.data.name, jobConfig);
client.commands.set(shift.data.name, shift);
client.commands.set(myStats.data.name, myStats);

client.once('ready', () => {
  console.log(`Logged in as ${client.user.tag}`);
  const intervalMs = Number(process.env.EXPIRY_CHECK_INTERVAL_MS) || 60000;
  startExpiryChecker(client, intervalMs);
});

client.on('interactionCreate', async (interaction) => {
  try {
    if (interaction.isChatInputCommand()) {
      const command = client.commands.get(interaction.commandName);
      if (!command) return;
      await command.execute(interaction);
      return;
    }

    if (interaction.isButton()) {
      if (interaction.customId.startsWith('claim_') || interaction.customId.startsWith('cantdo_')) {
        await handleJobButton(interaction);
      } else if (interaction.customId === 'ticket_close' || interaction.customId === 'ticket_delete') {
        await handleTicketButton(interaction);
      } else if (interaction.customId === 'post_job_open_modal') {
        await handleJobPanelButton(interaction);
      }
      return;
    }

    if (interaction.isStringSelectMenu()) {
      if (interaction.customId.startsWith('ticket_open_')) {
        await handleTicketSelect(interaction);
      }
      return;
    }

    if (interaction.isModalSubmit()) {
      if (interaction.customId.startsWith('ticket_form_')) {
        await handleTicketFormSubmit(interaction);
      } else if (interaction.customId === 'post_job_modal') {
        await handleJobModalSubmit(interaction);
      }
      return;
    }
  } catch (err) {
    console.error('Interaction error:', err);
    const errMsg = { content: 'Something went wrong handling that.', ephemeral: true };
    if (interaction.deferred || interaction.replied) {
      await interaction.followUp(errMsg).catch(() => {});
    } else {
      await interaction.reply(errMsg).catch(() => {});
    }
  }
});

client.login(process.env.DISCORD_TOKEN);
