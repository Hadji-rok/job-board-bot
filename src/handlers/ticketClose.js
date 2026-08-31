const {
  PermissionFlagsBits,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} = require('discord.js');
const { prisma } = require('../db');

/**
 * Handles the "Close Ticket" and "Delete Channel" buttons.
 */
async function handleTicketButton(interaction) {
  const ticket = await prisma.ticket.findFirst({
    where: { channelId: interaction.channel.id },
  });

  if (!ticket) {
    return interaction.reply({ content: 'This channel is not tracked as a ticket.', ephemeral: true });
  }

  const config = await prisma.guildConfig.findUnique({ where: { guildId: interaction.guildId } });
  const isStaff = config?.staffRoleId && interaction.member.roles.cache.has(config.staffRoleId);
  const isOpener = ticket.openedById === interaction.user.id;
  const isAdmin = interaction.member.permissions.has(PermissionFlagsBits.ManageGuild);

  if (interaction.customId === 'ticket_close') {
    if (!isStaff && !isOpener && !isAdmin) {
      return interaction.reply({ content: "You don't have permission to close this ticket.", ephemeral: true });
    }

    // Remove the opener's send permission but leave view access so they can still read history.
    await interaction.channel.permissionOverwrites.edit(ticket.openedById, {
      SendMessages: false,
    });

    await prisma.ticket.update({
      where: { id: ticket.id },
      data: { status: 'CLOSED', closedAt: new Date() },
    });

    const embed = new EmbedBuilder()
      .setColor(0x99aab5)
      .setDescription(`🔒 Ticket closed by <@${interaction.user.id}>. Staff can delete this channel when done.`);

    const deleteRow = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('ticket_delete').setLabel('Delete Channel').setEmoji('🗑️').setStyle(ButtonStyle.Danger)
    );

    await interaction.reply({ embeds: [embed], components: [deleteRow] });
    return;
  }

  if (interaction.customId === 'ticket_delete') {
    if (!isStaff && !isAdmin) {
      return interaction.reply({ content: 'Only staff can delete a ticket channel.', ephemeral: true });
    }

    await interaction.reply({ content: 'Deleting this channel in 5 seconds...' });
    setTimeout(() => {
      interaction.channel.delete().catch((err) => console.error('Failed to delete ticket channel:', err));
    }, 5000);
    return;
  }
}

module.exports = { handleTicketButton };
