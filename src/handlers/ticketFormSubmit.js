const { ModalBuilder, TextInputBuilder, ActionRowBuilder } = require('discord.js');
const { prisma } = require('../db');
const { createTicketChannel } = require('./ticketChannel');
const { TICKET_FORMS } = require('../ticketForms');

/**
 * Builds a ModalBuilder from a form config. customId encodes the ticket
 * type key so the submit handler knows which type/category to use.
 */
function buildTicketFormModal(key, form) {
  const modal = new ModalBuilder()
    .setCustomId(`ticket_form_${key}`)
    .setTitle(form.modalTitle.slice(0, 45)); // Discord modal title limit

  for (const field of form.fields) {
    const input = new TextInputBuilder()
      .setCustomId(field.customId)
      .setLabel(field.label.slice(0, 45)) // Discord text input label limit
      .setStyle(field.style)
      .setRequired(field.required);

    modal.addComponents(new ActionRowBuilder().addComponents(input));
  }

  return modal;
}

/**
 * Handles submission of a ticket pre-fill form.
 * customId format: ticket_form_<key>
 */
async function handleTicketFormSubmit(interaction) {
  const key = interaction.customId.replace('ticket_form_', '');
  const form = TICKET_FORMS[key];

  const ticketType = await prisma.ticketType.findUnique({
    where: { guildId_key: { guildId: interaction.guildId, key } },
  });

  if (!ticketType || !form) {
    return interaction.reply({ content: 'That ticket type no longer exists.', ephemeral: true });
  }

  await interaction.deferReply({ ephemeral: true });

  const answers = form.fields.map((field) => ({
    label: field.label,
    value: interaction.fields.getTextInputValue(field.customId),
  }));

  await createTicketChannel(interaction, ticketType, answers);
}

module.exports = { buildTicketFormModal, handleTicketFormSubmit };
