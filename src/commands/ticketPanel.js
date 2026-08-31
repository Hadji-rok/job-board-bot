const {
  SlashCommandBuilder,
  PermissionFlagsBits,
  EmbedBuilder,
  ActionRowBuilder,
  StringSelectMenuBuilder,
} = require('discord.js');
const { prisma } = require('../db');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('ticket-panel')
    .setDescription('Post the "Open a Ticket" panel in this channel')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),

  async execute(interaction) {
    const types = await prisma.ticketType.findMany({ where: { guildId: interaction.guildId } });
    const customerTypes = types.filter((t) => t.group === 'CUSTOMER');
    const supportTypes = types.filter((t) => t.group === 'SUPPORT');

    if (customerTypes.length === 0 && supportTypes.length === 0) {
      return interaction.reply({
        content: 'No ticket types configured yet. Add some with `/ticket-type add` first.',
        ephemeral: true,
      });
    }

    const embed = new EmbedBuilder()
      .setColor(0x0878d1)
      .setTitle('Open a Ticket')
      .setDescription('Pick the option below that matches what you need. A private channel will be created just for you.');

    const rows = [];

    if (customerTypes.length > 0) {
      const menu = new StringSelectMenuBuilder()
        .setCustomId('ticket_open_CUSTOMER')
        .setPlaceholder('Customer Ticket — hire a service')
        .addOptions(
          customerTypes.map((t) => ({
            label: t.label,
            description: t.description.slice(0, 100),
            value: t.key,
          }))
        );
      rows.push(new ActionRowBuilder().addComponents(menu));
    }

    if (supportTypes.length > 0) {
      const menu = new StringSelectMenuBuilder()
        .setCustomId('ticket_open_SUPPORT')
        .setPlaceholder('Support Ticket — get help')
        .addOptions(
          supportTypes.map((t) => ({
            label: t.label,
            description: t.description.slice(0, 100),
            value: t.key,
          }))
        );
      rows.push(new ActionRowBuilder().addComponents(menu));
    }

    await interaction.channel.send({ embeds: [embed], components: rows });
    await interaction.reply({ content: 'Ticket panel posted.', ephemeral: true });
  },
};
