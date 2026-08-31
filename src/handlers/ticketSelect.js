const { prisma } = require('../db');
const { createTicketChannel } = require('./ticketChannel');
const { buildTicketFormModal } = require('./ticketFormSubmit');
const { TICKET_FORMS } = require('../ticketForms');

/**
 * Handles selections on the ticket panel dropdowns.
 * customId format: ticket_open_CUSTOMER or ticket_open_SUPPORT
 */
async function handleTicketSelect(interaction) {
  const key = interaction.values[0];

  const ticketType = await prisma.ticketType.findUnique({
    where: { guildId_key: { guildId: interaction.guildId, key } },
  });

  if (!ticketType) {
    return interaction.reply({ content: 'That ticket type no longer exists.', ephemeral: true });
  }

  const form = TICKET_FORMS[key];

  if (form) {
    // Show the pre-fill form; the channel gets created on modal submit.
    const modal = buildTicketFormModal(key, form);
    return interaction.showModal(modal);
  }

  await interaction.deferReply({ ephemeral: true });
  await createTicketChannel(interaction, ticketType);
}

module.exports = { handleTicketSelect };
