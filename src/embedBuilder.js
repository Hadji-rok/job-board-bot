const {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} = require('discord.js');

/**
 * Builds the job embed matching the reference layout:
 * title, Kingdom/Payment/When, Posted by, Eligible Roles,
 * Linked Ticket, Claimed by (once claimed).
 */
function buildJobEmbed(job, thumbnailUrl) {
  const color =
    job.status === 'OPEN' ? 0x0878d1 :
    job.status === 'CLAIMED' ? 0x57f287 :
    job.status === 'CLOSED' ? 0x99aab5 :
    0xed4245; // EXPIRED

  const embed = new EmbedBuilder()
    .setColor(color)
    .setTitle(`🎫 ${job.title}`)
    .addFields(
      { name: 'Kingdom', value: job.kingdom, inline: true },
      { name: 'Payment', value: job.payment, inline: true },
      { name: 'When', value: job.whenText, inline: true },
      { name: 'Posted by', value: `<@${job.postedById}>` },
      { name: 'Eligible Roles', value: `<@&${job.eligibleRoleId}>` },
      { name: 'Linked Ticket', value: job.linkedTicket ? job.linkedTicket : '# *unknown*' },
    );

  if (thumbnailUrl) {
    embed.setThumbnail(thumbnailUrl);
  }

  if (job.claimedById) {
    embed.addFields({ name: 'Claimed by', value: `<@${job.claimedById}>` });
  }

  if (job.status === 'CLOSED') {
    embed.setFooter({ text: `Job #${job.id} · This job has been closed.` });
  } else if (job.status === 'EXPIRED') {
    embed.setFooter({ text: `Job #${job.id} · This job expired.` });
  } else if (job.expiresAt) {
    embed.setFooter({ text: `Job #${job.id} · Expires` }).setTimestamp(job.expiresAt);
  } else {
    embed.setFooter({ text: `Job #${job.id}` });
  }

  return embed;
}

function buildJobButtons(job) {
  const claimedBtn = new ButtonBuilder()
    .setCustomId(`claim_${job.id}`)
    .setLabel('Claimed')
    .setEmoji('✅')
    .setStyle(job.status === 'CLAIMED' ? ButtonStyle.Success : ButtonStyle.Secondary)
    .setDisabled(job.status !== 'OPEN');

  const cantDoBtn = new ButtonBuilder()
    .setCustomId(`cantdo_${job.id}`)
    .setLabel("Can't Do It")
    .setEmoji('🔄')
    .setStyle(ButtonStyle.Danger)
    .setDisabled(job.status !== 'CLAIMED');

  const row = new ActionRowBuilder().addComponents(claimedBtn, cantDoBtn);
  return job.status === 'CLOSED' || job.status === 'EXPIRED' ? [] : [row];
}

module.exports = { buildJobEmbed, buildJobButtons };
