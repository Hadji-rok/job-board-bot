const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { prisma } = require('../db');
const { buildJobEmbed, buildJobButtons } = require('../embedBuilder');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('close-job')
    .setDescription('Manually close a job listing')
    .addIntegerOption((opt) =>
      opt.setName('job_id').setDescription('The job ID to close').setRequired(true))
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),

  async execute(interaction) {
    const jobId = interaction.options.getInteger('job_id');
    const job = await prisma.job.findUnique({ where: { id: jobId } });

    if (!job || job.guildId !== interaction.guildId) {
      return interaction.reply({ content: `No job found with ID ${jobId} in this server.`, ephemeral: true });
    }

    if (job.status === 'CLOSED' || job.status === 'EXPIRED') {
      return interaction.reply({ content: `Job #${jobId} is already closed.`, ephemeral: true });
    }

    const updated = await prisma.job.update({
      where: { id: jobId },
      data: { status: 'CLOSED' },
    });

    await interaction.reply({ content: `Closed job #${jobId}: **${job.title}**.` });

    try {
      const channel = await interaction.client.channels.fetch(job.channelId);
      const message = await channel.messages.fetch(job.messageId);
      await message.edit({
        embeds: [buildJobEmbed(updated)],
        components: buildJobButtons(updated),
      });
    } catch (err) {
      console.error(`Failed to update message for closed job ${jobId}:`, err);
    }
  },
};
