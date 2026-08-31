const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { prisma } = require('../db');
const { buildJobEmbed, buildJobButtons } = require('../embedBuilder');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('force-release')
    .setDescription("Force-drop a job from its claimed pilot (e.g. they went unresponsive)")
    .addIntegerOption((opt) =>
      opt.setName('job_id').setDescription('The job ID to release').setRequired(true))
    .addStringOption((opt) =>
      opt.setName('reason').setDescription("Why it's being dropped (shown in the announcement)").setRequired(false))
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),

  async execute(interaction) {
    const jobId = interaction.options.getInteger('job_id');
    const reason = interaction.options.getString('reason');
    const job = await prisma.job.findUnique({ where: { id: jobId } });

    if (!job || job.guildId !== interaction.guildId) {
      return interaction.reply({ content: `No job found with ID ${jobId} in this server.`, ephemeral: true });
    }

    if (job.status !== 'CLAIMED') {
      return interaction.reply({ content: `Job #${jobId} isn't currently claimed by anyone.`, ephemeral: true });
    }

    const previousClaimerId = job.claimedById;

    const updated = await prisma.job.update({
      where: { id: jobId },
      data: {
        status: 'OPEN',
        claimedById: null,
        claimedByTag: null,
      },
    });

    try {
      const channel = await interaction.client.channels.fetch(job.channelId);
      const oldMessage = await channel.messages.fetch(job.messageId);
      await oldMessage.edit({
        content: 'Reposted below so it stays easy to spot ⬇️',
        embeds: [],
        components: [],
      });

      const reasonText = reason ? ` — ${reason}` : '';
      await channel.send(
        `⚠️ <@${interaction.user.id}> released **${job.title}** from <@${previousClaimerId}> — it's open again${reasonText}! <@&${job.eligibleRoleId}>`
      );

      const repost = await channel.send({
        embeds: [buildJobEmbed(updated)],
        components: buildJobButtons(updated),
      });

      await prisma.job.update({
        where: { id: jobId },
        data: { messageId: repost.id },
      });
    } catch (err) {
      console.error(`Failed to update message for force-released job ${jobId}:`, err);
    }

    await interaction.reply({
      content: `Released job #${jobId}: **${job.title}** from <@${previousClaimerId}>. It's open again.`,
      ephemeral: true,
    });
  },
};
