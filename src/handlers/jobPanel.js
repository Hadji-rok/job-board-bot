const {
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ActionRowBuilder,
  PermissionFlagsBits,
} = require('discord.js');
const ms = require('ms');
const { prisma } = require('../db');
const { buildJobEmbed, buildJobButtons } = require('../embedBuilder');

/**
 * Checks whether the interacting member is allowed to post jobs:
 * either the configured staff role, or anyone with Manage Server.
 */
async function canPostJobs(interaction) {
  if (interaction.member.permissions.has(PermissionFlagsBits.ManageGuild)) return true;
  const config = await prisma.guildConfig.findUnique({ where: { guildId: interaction.guildId } });
  return !!(config?.staffRoleId && interaction.member.roles.cache.has(config.staffRoleId));
}

/**
 * Triggered when the "Post a Job" button in the admin panel is clicked.
 * Shows a modal form for the job details.
 */
async function handleJobPanelButton(interaction) {
  if (!(await canPostJobs(interaction))) {
    return interaction.reply({
      content: "You don't have permission to post jobs.",
      ephemeral: true,
    });
  }

  const modal = new ModalBuilder()
    .setCustomId('post_job_modal')
    .setTitle('Post a Job');

  const titleInput = new TextInputBuilder()
    .setCustomId('title')
    .setLabel('Job Title')
    .setStyle(TextInputStyle.Short)
    .setRequired(true);

  const kingdomInput = new TextInputBuilder()
    .setCustomId('kingdom')
    .setLabel('Kingdom')
    .setStyle(TextInputStyle.Short)
    .setRequired(true);

  const paymentInput = new TextInputBuilder()
    .setCustomId('payment')
    .setLabel('Payment')
    .setStyle(TextInputStyle.Short)
    .setRequired(true);

  const roleInput = new TextInputBuilder()
    .setCustomId('eligible_role')
    .setLabel('Eligible Role (exact role name)')
    .setStyle(TextInputStyle.Short)
    .setRequired(true);

  const extraInput = new TextInputBuilder()
    .setCustomId('extra')
    .setLabel('When / Linked Ticket / Expires in (optional)')
    .setPlaceholder('e.g. When: NOW | Ticket: #ticket-test | Expires: 2h')
    .setStyle(TextInputStyle.Paragraph)
    .setRequired(false);

  modal.addComponents(
    new ActionRowBuilder().addComponents(titleInput),
    new ActionRowBuilder().addComponents(kingdomInput),
    new ActionRowBuilder().addComponents(paymentInput),
    new ActionRowBuilder().addComponents(roleInput),
    new ActionRowBuilder().addComponents(extraInput)
  );

  await interaction.showModal(modal);
}

/**
 * Parses the free-text "extra" field for optional When / Linked Ticket / Expires values.
 * Expected loose format: "When: NOW | Ticket: #ticket-test | Expires: 2h" (any subset, any order).
 */
function parseExtra(raw) {
  const result = { when: null, linkedTicket: null, expiresInRaw: null };
  if (!raw) return result;

  const parts = raw.split('|').map((p) => p.trim());
  for (const part of parts) {
    const [keyRaw, ...rest] = part.split(':');
    const key = (keyRaw || '').trim().toLowerCase();
    const value = rest.join(':').trim();
    if (!value) continue;

    if (key.startsWith('when')) result.when = value;
    else if (key.startsWith('ticket')) result.linkedTicket = value;
    else if (key.startsWith('expire')) result.expiresInRaw = value;
  }

  return result;
}

/**
 * Triggered when the "Post a Job" modal is submitted.
 * Looks up the role by name, creates the job, and posts it to the configured channel.
 */
async function handleJobModalSubmit(interaction) {
  if (!(await canPostJobs(interaction))) {
    return interaction.reply({
      content: "You don't have permission to post jobs.",
      ephemeral: true,
    });
  }

  const title = interaction.fields.getTextInputValue('title');
  const kingdom = interaction.fields.getTextInputValue('kingdom');
  const payment = interaction.fields.getTextInputValue('payment');
  const roleName = interaction.fields.getTextInputValue('eligible_role');
  const extraRaw = interaction.fields.getTextInputValue('extra');

  const { when, linkedTicket, expiresInRaw } = parseExtra(extraRaw);

  await interaction.guild.roles.fetch();
  const eligibleRole = interaction.guild.roles.cache.find(
    (r) => r.name.toLowerCase() === roleName.trim().toLowerCase()
  );

  if (!eligibleRole) {
    return interaction.reply({
      content: `Couldn't find a role named "${roleName}". Check the spelling matches exactly (case doesn't matter).`,
      ephemeral: true,
    });
  }

  let expiresAt = null;
  if (expiresInRaw) {
    const durationMs = ms(expiresInRaw);
    if (!durationMs) {
      return interaction.reply({
        content: `Couldn't parse expiry "${expiresInRaw}". Try formats like "2h", "30m", "1d".`,
        ephemeral: true,
      });
    }
    expiresAt = new Date(Date.now() + durationMs);
  }

  const config = await prisma.guildConfig.findUnique({ where: { guildId: interaction.guildId } });
  if (!config?.jobPostChannelId) {
    return interaction.reply({
      content: 'No job-offers channel configured. Run `/job-config channel` first.',
      ephemeral: true,
    });
  }

  const jobChannel = await interaction.client.channels.fetch(config.jobPostChannelId).catch(() => null);
  if (!jobChannel) {
    return interaction.reply({
      content: 'The configured job-offers channel no longer exists. Set a new one with `/job-config channel`.',
      ephemeral: true,
    });
  }

  await interaction.deferReply({ ephemeral: true });

  const job = await prisma.job.create({
    data: {
      title,
      kingdom,
      payment,
      whenText: when || 'NOW',
      linkedTicket,
      postedById: interaction.user.id,
      postedByTag: interaction.user.tag,
      eligibleRoleId: eligibleRole.id,
      eligibleRoleName: eligibleRole.name,
      guildId: interaction.guildId,
      channelId: jobChannel.id,
      expiresAt,
    },
  });

  const embed = buildJobEmbed(job, interaction.guild.iconURL({ size: 256 }));
  const rows = buildJobButtons(job);

  const message = await jobChannel.send({
    content: `${eligibleRole}`,
    embeds: [embed],
    components: rows,
    allowedMentions: { roles: [eligibleRole.id] },
  });

  await prisma.job.update({
    where: { id: job.id },
    data: { messageId: message.id },
  });

  await interaction.editReply({ content: `Posted! Job #${job.id} is live in ${jobChannel}.` });
}

module.exports = { handleJobPanelButton, handleJobModalSubmit };
