const { SlashCommandBuilder } = require('discord.js');
const { prisma } = require('../db');

function formatDuration(ms) {
  const totalMinutes = Math.floor(ms / 60000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours === 0) return `${minutes}m`;
  return `${hours}h ${minutes}m`;
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('shift')
    .setDescription('Clock in and out of a work shift')
    .addSubcommand((sub) => sub.setName('start').setDescription('Start a shift'))
    .addSubcommand((sub) => sub.setName('end').setDescription('End your current shift'))
    .addSubcommand((sub) => sub.setName('status').setDescription('Check your current shift')),

  async execute(interaction) {
    const sub = interaction.options.getSubcommand();
    const guildId = interaction.guildId;
    const userId = interaction.user.id;

    const activeShift = await prisma.shift.findFirst({
      where: { guildId, userId, endedAt: null },
      orderBy: { startedAt: 'desc' },
    });

    if (sub === 'start') {
      if (activeShift) {
        return interaction.reply({
          content: `You already have a shift running (started <t:${Math.floor(activeShift.startedAt.getTime() / 1000)}:R>). Run \`/shift end\` first.`,
          ephemeral: true,
        });
      }

      await prisma.shift.create({ data: { guildId, userId } });
      return interaction.reply({ content: '🟢 Shift started. Run `/shift end` when you wrap up.', ephemeral: true });
    }

    if (sub === 'end') {
      if (!activeShift) {
        return interaction.reply({ content: "You don't have a shift running. Start one with `/shift start`.", ephemeral: true });
      }

      const endedAt = new Date();
      await prisma.shift.update({
        where: { id: activeShift.id },
        data: { endedAt },
      });

      const duration = formatDuration(endedAt.getTime() - activeShift.startedAt.getTime());
      return interaction.reply({ content: `🔴 Shift ended. You worked **${duration}**.`, ephemeral: true });
    }

    if (sub === 'status') {
      if (!activeShift) {
        return interaction.reply({ content: 'No active shift. Start one with `/shift start`.', ephemeral: true });
      }

      const duration = formatDuration(Date.now() - activeShift.startedAt.getTime());
      return interaction.reply({
        content: `🟢 Active shift, running for **${duration}** (started <t:${Math.floor(activeShift.startedAt.getTime() / 1000)}:R>).`,
        ephemeral: true,
      });
    }
  },
};
