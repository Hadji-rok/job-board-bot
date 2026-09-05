const {
  ChannelType,
  PermissionFlagsBits,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} = require('discord.js');
const { prisma } = require('../db');

function slugify(text) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .slice(0, 20);
}

/**
 * Creates a private ticket channel for the given ticketType and posts the
 * welcome embed. Assumes interaction.deferReply({ ephemeral: true }) has
 * already been called by the caller; calls interaction.editReply at the end.
 *
 * `answers` (optional) is an array of { label, value } pairs from a
 * pre-fill form, shown as fields on the welcome embed.
 */
async function createTicketChannel(interaction, ticketType, answers = []) {
  const config = await prisma.guildConfig.findUnique({ where: { guildId: interaction.guildId } });
  if (!config?.staffRoleId) {
    return interaction.editReply({
      content: 'No staff role has been configured yet. Ask an admin to run `/ticket-config staff-role` first.',
    });
  }

  const openTicketCount = await prisma.ticket.count({
    where: { guildId: interaction.guildId, openedById: interaction.user.id, status: 'OPEN' },
  });
  const MAX_OPEN_TICKETS_PER_USER = 3;
  if (openTicketCount >= MAX_OPEN_TICKETS_PER_USER) {
    return interaction.editReply({
      content: `You already have ${openTicketCount} open tickets. Please close one before opening another.`,
    });
  }

  const guild = interaction.guild;
  const everyoneId = guild.roles.everyone.id;

  const permissionOverwrites = [
    { id: everyoneId, deny: [PermissionFlagsBits.ViewChannel] },
    {
      id: interaction.user.id,
      allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory],
    },
    {
      id: config.staffRoleId,
      allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory],
    },
    {
      id: guild.members.me.id,
      allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ManageChannels],
    },
  ];

  let channel;
  try {
    channel = await guild.channels.create({
      name: `${slugify(ticketType.label)}-${interaction.user.username}`,
      type: ChannelType.GuildText,
      parent: ticketType.categoryId || undefined,
      permissionOverwrites,
      topic: `${ticketType.label} ticket for ${interaction.user.tag}`,
    });
  } catch (err) {
    console.error('Failed to create ticket channel:', err);
    return interaction.editReply({ content: 'Failed to create the ticket channel. Check the bot has Manage Channels permission.' });
  }

  await prisma.ticket.create({
    data: {
      guildId: interaction.guildId,
      channelId: channel.id,
      openedById: interaction.user.id,
      ticketTypeKey: ticketType.key,
      ticketLabel: ticketType.label,
    },
  });

  const welcomeEmbed = new EmbedBuilder()
    .setColor(0x0878d1)
    .setTitle(ticketType.label)
    .setDescription(`${ticketType.description}\n\nThanks for reaching out, <@${interaction.user.id}>! Staff (<@&${config.staffRoleId}>) will be with you shortly.`);

  for (const answer of answers) {
    welcomeEmbed.addFields({
      name: answer.label,
      value: answer.value?.trim() ? answer.value.slice(0, 1024) : '*(no answer)*',
    });
  }

  const closeButton = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('ticket_close').setLabel('Close Ticket').setEmoji('🔒').setStyle(ButtonStyle.Danger)
  );

  await channel.send({
    content: `<@${interaction.user.id}> <@&${config.staffRoleId}>`,
    embeds: [welcomeEmbed],
    components: [closeButton],
  });

  await interaction.editReply({ content: `Your ticket is ready: ${channel}` });
}

module.exports = { createTicketChannel };
