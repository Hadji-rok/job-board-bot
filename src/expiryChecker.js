const { prisma } = require('./db');
const { buildJobEmbed, buildJobButtons } = require('./embedBuilder');

async function checkExpiredJobs(client) {
  const now = new Date();

  const expired = await prisma.job.findMany({
    where: {
      status: { in: ['OPEN', 'CLAIMED'] },
      expiresAt: { not: null, lte: now },
    },
  });

  for (const job of expired) {
    try {
      const updated = await prisma.job.update({
        where: { id: job.id },
        data: { status: 'EXPIRED' },
      });

      const channel = await client.channels.fetch(job.channelId);
      const message = await channel.messages.fetch(job.messageId);
      await message.edit({
        embeds: [buildJobEmbed(updated)],
        components: buildJobButtons(updated),
      });
      await channel.send(`⏰ Job #${job.id} **${job.title}** has expired.`);
    } catch (err) {
      console.error(`Failed to expire job ${job.id}:`, err);
    }
  }
}

function startExpiryChecker(client, intervalMs) {
  checkExpiredJobs(client); // run once on startup
  setInterval(() => checkExpiredJobs(client), intervalMs);
}

module.exports = { startExpiryChecker };
