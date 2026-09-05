const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const ms = require('ms');
const { prisma } = require('../db');
const { buildJobEmbed, buildJobButtons } = require('../embedBuilder');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('post-job')
    .setDescription('Post a paid job for an eligible role to claim')
    .addStringOption((opt) =>
      opt.setName('title').setDescription('Job title').setRequired(true))
    .addStringOption((opt) =>
      opt.setName('kingdom').setDescription('Kingdom number').setRequired(true))
    .addStringOption((opt) =>
      opt.setName('payment').setDescription('Payment amount / rate').setRequired(true))
    .addRoleOption((opt) =>
      opt.setName('eligible_role').setDescription('Role allowed to claim this job').setRequired(true))
    .addStringOption((opt) =>
      opt.setName('when').setDescription('When the job happens (default: NOW)').setRequired(false))
    .addStringOption((opt) =>
      opt.setName('linked_ticket').setDescription('Linked ticket reference').setRequired(false))
    .addStringOption((opt) =>
      opt.setName('expires_in').setDescription("Auto-expire after e.g. '2h', '30m'").setRequired(false))
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),

  async execute(interaction) {
    const title = interaction.options.getString('title');
    const kingdom = interaction.options.getString('kingdom');
    const payment = interaction.options.getString('payment');
    const eligibleRole = interaction.options.getRole('eligible_role');
    const whenText = interaction.options.getString('when') || 'NOW';
    const linkedTicket = interaction.options.getString('linked_ticket');
    const expiresInRaw = interaction.options.getString('expires_in');

    let expiresAt = null;
    if (expiresInRaw) {
      const durationMs = ms(expiresInRaw);
      if (!durationMs) {
        return interaction.reply({
          content: `Couldn't parse "${expiresInRaw}". Try formats like "2h", "30m", "1d".`,
          ephemeral: true,
        });
      }
      expiresAt = new Date(Date.now() + durationMs);
    }

    await interaction.deferReply();

    const job = await prisma.job.create({
      data: {
        title,
        kingdom,
        payment,
        whenText,
        linkedTicket,
        postedById: interaction.user.id,
        postedByTag: interaction.user.tag,
        eligibleRoleId: eligibleRole.id,
        eligibleRoleName: eligibleRole.name,
        guildId: interaction.guildId,
        channelId: interaction.channelId,
        expiresAt,
      },
    });

    const embed = buildJobEmbed(job, interaction.guild.iconURL({ size: 256 }));
    const rows = buildJobButtons(job);

    const message = await interaction.editReply({
      content: `${eligibleRole}`,
      embeds: [embed],
      components: rows,
      allowedMentions: { roles: [eligibleRole.id] },
    });

    await prisma.job.update({
      where: { id: job.id },
      data: { messageId: message.id },
    });
  },
};
