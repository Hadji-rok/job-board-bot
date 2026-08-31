const { prisma } = require('../db');
const { buildJobEmbed, buildJobButtons } = require('../embedBuilder');

/**
 * Handles clicks on the "Claimed" and "Can't Do It" buttons.
 * customId format: claim_<jobId> or cantdo_<jobId>
 */
async function handleJobButton(interaction) {
  const [action, jobIdRaw] = interaction.customId.split('_');
  const jobId = Number(jobIdRaw);

  const job = await prisma.job.findUnique({ where: { id: jobId } });
  if (!job) {
    return interaction.reply({ content: 'This job no longer exists.', ephemeral: true });
  }

  const member = interaction.member;

  if (action === 'claim') {
    if (job.status !== 'OPEN') {
      return interaction.reply({ content: 'This job is no longer open.', ephemeral: true });
    }

    const hasRole = member.roles.cache.has(job.eligibleRoleId);
    if (!hasRole) {
      return interaction.reply({
        content: `You need the <@&${job.eligibleRoleId}> role to claim this.`,
        ephemeral: true,
      });
    }

    const updated = await prisma.job.update({
      where: { id: jobId },
      data: {
        status: 'CLAIMED',
        claimedById: interaction.user.id,
        claimedByTag: interaction.user.tag,
      },
    });

    await interaction.update({
      content: interaction.message.content,
      embeds: [buildJobEmbed(updated)],
      components: buildJobButtons(updated),
    });

    await interaction.channel.send(
      `🎉 <@${interaction.user.id}> claimed **${job.title}**!`
    );
    return;
  }

  if (action === 'cantdo') {
    if (job.status !== 'CLAIMED') {
      return interaction.reply({ content: 'This job is not currently claimed.', ephemeral: true });
    }

    const isClaimer = job.claimedById === interaction.user.id;
    if (!isClaimer) {
      return interaction.reply({
        content: 'Only the pilot who claimed this job can mark themselves as unable to do it.',
        ephemeral: true,
      });
    }

    const updated = await prisma.job.update({
      where: { id: jobId },
      data: {
        status: 'OPEN',
        claimedById: null,
        claimedByTag: null,
      },
    });

    // Collapse the old message so it doesn't look like the live post anymore,
    // then repost the embed at the bottom of the channel so it's easy to spot.
    await interaction.update({
      content: 'Reposted below so it stays easy to spot ⬇️',
      embeds: [],
      components: [],
    });

    await interaction.channel.send(
      `⚠️ <@${interaction.user.id}> can no longer do **${job.title}** — it's open again! <@&${job.eligibleRoleId}>`
    );

    const repost = await interaction.channel.send({
      embeds: [buildJobEmbed(updated)],
      components: buildJobButtons(updated),
    });

    await prisma.job.update({
      where: { id: jobId },
      data: { messageId: repost.id },
    });
    return;
  }
}

module.exports = { handleJobButton };