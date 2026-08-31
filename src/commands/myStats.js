const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { prisma } = require('../db');

function formatHours(totalMs) {
  const totalMinutes = Math.round(totalMs / 60000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${hours}h ${minutes}m`;
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('mystats')
    .setDescription('View your shift and job stats'),

  async execute(interaction) {
    const guildId = interaction.guildId;
    const userId = interaction.user.id;

    const [completedShifts, activeShift, jobsClaimed] = await Promise.all([
      prisma.shift.findMany({ where: { guildId, userId, endedAt: { not: null } } }),
      prisma.shift.findFirst({ where: { guildId, userId, endedAt: null } }),
      prisma.job.count({ where: { guildId, claimedById: userId } }),
    ]);

    const totalMs = completedShifts.reduce(
      (sum, s) => sum + (s.endedAt.getTime() - s.startedAt.getTime()),
      0
    );

    const embed = new EmbedBuilder()
      .setColor(0x2b2d31)
      .setTitle(`📊 Stats for ${interaction.user.username}`)
      .addFields(
        { name: 'Completed Shifts', value: `${completedShifts.length}`, inline: true },
        { name: 'Total Hours Logged', value: formatHours(totalMs), inline: true },
        { name: 'Jobs Claimed', value: `${jobsClaimed}`, inline: true },
      );

    if (activeShift) {
      const runningMs = Date.now() - activeShift.startedAt.getTime();
      embed.addFields({ name: 'Current Shift', value: `🟢 Running — ${formatHours(runningMs)} so far` });
    }

    return interaction.reply({ embeds: [embed], ephemeral: true });
  },
};
