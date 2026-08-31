const { SlashCommandBuilder, PermissionFlagsBits, ChannelType } = require('discord.js');
const { prisma } = require('../db');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('ticket-type')
    .setDescription('Manage ticket types shown in the ticket panel dropdowns')
    .addSubcommand((sub) =>
      sub
        .setName('add')
        .setDescription('Add or update a ticket type')
        .addStringOption((opt) =>
          opt.setName('key').setDescription('Unique short key, e.g. war_piloting').setRequired(true))
        .addStringOption((opt) =>
          opt.setName('label').setDescription('Display name, e.g. "War Piloting"').setRequired(true))
        .addStringOption((opt) =>
          opt.setName('description').setDescription('One-line description shown in the dropdown').setRequired(true))
        .addStringOption((opt) =>
          opt
            .setName('group')
            .setDescription('Which dropdown this belongs under')
            .setRequired(true)
            .addChoices(
              { name: 'Customer Ticket — hire a service', value: 'CUSTOMER' },
              { name: 'Support Ticket — get help', value: 'SUPPORT' },
            ))
        .addChannelOption((opt) =>
          opt
            .setName('category')
            .setDescription('Category new ticket channels of this type will be created under')
            .addChannelTypes(ChannelType.GuildCategory)
            .setRequired(false)))
    .addSubcommand((sub) =>
      sub
        .setName('remove')
        .setDescription('Remove a ticket type')
        .addStringOption((opt) =>
          opt.setName('key').setDescription('Key of the ticket type to remove').setRequired(true)))
    .addSubcommand((sub) => sub.setName('list').setDescription('List configured ticket types'))
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),

  async execute(interaction) {
    const sub = interaction.options.getSubcommand();

    if (sub === 'add') {
      const key = interaction.options.getString('key').trim().toLowerCase().replace(/\s+/g, '_');
      const label = interaction.options.getString('label');
      const description = interaction.options.getString('description');
      const group = interaction.options.getString('group');
      const category = interaction.options.getChannel('category');

      await prisma.ticketType.upsert({
        where: { guildId_key: { guildId: interaction.guildId, key } },
        create: {
          guildId: interaction.guildId,
          key,
          label,
          description,
          group,
          categoryId: category ? category.id : null,
        },
        update: {
          label,
          description,
          group,
          ...(category ? { categoryId: category.id } : {}),
        },
      });

      const categoryNote = category
        ? `under category **${category.name}**`
        : 'with no category set yet — set one with `/ticket-type add` again and pick a category, or tickets will be created at the server root';

      return interaction.reply({
        content: `Saved ticket type **${label}** (\`${key}\`) in the ${group === 'CUSTOMER' ? 'Customer' : 'Support'} dropdown, ${categoryNote}.`,
        ephemeral: true,
      });
    }

    if (sub === 'remove') {
      const key = interaction.options.getString('key').trim().toLowerCase().replace(/\s+/g, '_');
      try {
        await prisma.ticketType.delete({ where: { guildId_key: { guildId: interaction.guildId, key } } });
        return interaction.reply({ content: `Removed ticket type \`${key}\`.`, ephemeral: true });
      } catch {
        return interaction.reply({ content: `No ticket type found with key \`${key}\`.`, ephemeral: true });
      }
    }

    if (sub === 'list') {
      const types = await prisma.ticketType.findMany({ where: { guildId: interaction.guildId } });
      if (types.length === 0) {
        return interaction.reply({ content: 'No ticket types configured yet. Add one with `/ticket-type add`.', ephemeral: true });
      }

      const customer = types.filter((t) => t.group === 'CUSTOMER');
      const support = types.filter((t) => t.group === 'SUPPORT');

      const format = (t) => `• **${t.label}** (\`${t.key}\`) — ${t.description}${t.categoryId ? ` — <#${t.categoryId}>` : ' — ⚠️ no category set'}`;

      const lines = [
        '**Customer Ticket — hire a service**',
        ...(customer.length ? customer.map(format) : ['*(none)*']),
        '',
        '**Support Ticket — get help**',
        ...(support.length ? support.map(format) : ['*(none)*']),
      ];

      return interaction.reply({ content: lines.join('\n'), ephemeral: true });
    }
  },
};
