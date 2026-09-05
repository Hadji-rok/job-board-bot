const {
  PermissionFlagsBits,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  AttachmentBuilder,
} = require('discord.js');
const { prisma } = require('../db');
const { buildTranscript } = require('../transcript');

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

    await interaction.deferReply();

    // Remove the opener's send permission but leave view access so they can still read history.
    await interaction.channel.permissionOverwrites.edit(ticket.openedById, {
      SendMessages: false,
    });

    await prisma.ticket.update({
      where: { id: ticket.id },
      data: { status: 'CLOSED', closedAt: new Date() },
    });

    let openedByTag = ticket.openedById;
    try {
      const openedByUser = await interaction.client.users.fetch(ticket.openedById);
      openedByTag = openedByUser.tag;
    } catch {}

    const { attachment, messageCount } = await buildTranscript(interaction.channel, {
      ticketLabel: ticket.ticketLabel,
      openedByTag,
      closedByTag: interaction.user.tag,
    });

    const embed = new EmbedBuilder()
      .setColor(0x99aab5)
      .setDescription(`🔒 Ticket closed by <@${interaction.user.id}>. Staff can delete this channel when done.`);

    const deleteRow = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('ticket_delete').setLabel('Delete Channel').setEmoji('🗑️').setStyle(ButtonStyle.Danger)
    );

    await interaction.editReply({ embeds: [embed], components: [deleteRow], files: [attachment] });

    if (config?.ticketLogChannelId) {
      try {
        const logChannel = await interaction.client.channels.fetch(config.ticketLogChannelId);
        const logEmbed = new EmbedBuilder()
          .setColor(0x0878d1)
          .setTitle(`Transcript — #${interaction.channel.name}`)
          .addFields(
            { name: 'Ticket Type', value: ticket.ticketLabel, inline: true },
            { name: 'Opened by', value: `<@${ticket.openedById}>`, inline: true },
            { name: 'Closed by', value: `<@${interaction.user.id}>`, inline: true },
            { name: 'Messages', value: `${messageCount}`, inline: true },
          );

        const logAttachment = new AttachmentBuilder(attachment.attachment, {
          name: attachment.name,
        });

        await logChannel.send({ embeds: [logEmbed], files: [logAttachment] });
      } catch (err) {
        console.error('Failed to send transcript to log channel:', err);
      }
    }

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
