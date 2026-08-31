const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { prisma } = require('../db');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('ticket-config')
    .setDescription('Configure ticket system settings')
    .addSubcommand((sub) =>
      sub
        .setName('staff-role')
        .setDescription('Set the role that can see and manage ticket channels')
        .addRoleOption((opt) =>
          opt.setName('role').setDescription('The staff role').setRequired(true)))
    .addSubcommand((sub) =>
      sub.setName('view').setDescription('View the current ticket configuration'))
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),

  async execute(interaction) {
    const sub = interaction.options.getSubcommand();

    if (sub === 'staff-role') {
      const role = interaction.options.getRole('role');
      await prisma.guildConfig.upsert({
        where: { guildId: interaction.guildId },
        create: { guildId: interaction.guildId, staffRoleId: role.id },
        update: { staffRoleId: role.id },
      });
      return interaction.reply({ content: `Staff role set to ${role}. They'll be added to every new ticket channel.`, ephemeral: true });
    }

    if (sub === 'view') {
      const config = await prisma.guildConfig.findUnique({ where: { guildId: interaction.guildId } });
      if (!config?.staffRoleId) {
        return interaction.reply({ content: 'No staff role configured yet. Run `/ticket-config staff-role`.', ephemeral: true });
      }
      return interaction.reply({ content: `Staff role: <@&${config.staffRoleId}>`, ephemeral: true });
    }
  },
};
