const {
  SlashCommandBuilder,
  PermissionFlagsBits,
  ChannelType,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} = require('discord.js');
const { prisma } = require('../db');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('job-config')
    .setDescription('Configure the job posting system')
    .addSubcommand((sub) =>
      sub
        .setName('channel')
        .setDescription('Set the channel where finished job listings get posted')
        .addChannelOption((opt) =>
          opt
            .setName('channel')
            .setDescription('The job-offers channel')
            .addChannelTypes(ChannelType.GuildText)
            .setRequired(true)))
    .addSubcommand((sub) =>
      sub.setName('panel').setDescription('Post the "Post a Job" button in this channel'))
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),

  async execute(interaction) {
    const sub = interaction.options.getSubcommand();

    if (sub === 'channel') {
      const channel = interaction.options.getChannel('channel');
      await prisma.guildConfig.upsert({
        where: { guildId: interaction.guildId },
        create: { guildId: interaction.guildId, jobPostChannelId: channel.id },
        update: { jobPostChannelId: channel.id },
      });
      return interaction.reply({
        content: `Job listings will now be posted to ${channel}.`,
        ephemeral: true,
      });
    }

    if (sub === 'panel') {
      const config = await prisma.guildConfig.findUnique({ where: { guildId: interaction.guildId } });
      if (!config?.jobPostChannelId) {
        return interaction.reply({
          content: 'Set a job-offers channel first with `/job-config channel`.',
          ephemeral: true,
        });
      }

      const embed = new EmbedBuilder()
        .setColor(0x0878d1)
        .setTitle('📋 Post a Job')
        .setDescription(`Click the button below to fill out a job listing. It'll be posted to <#${config.jobPostChannelId}>.`);

      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId('post_job_open_modal')
          .setLabel('Post a Job')
          .setEmoji('📋')
          .setStyle(ButtonStyle.Primary)
      );

      await interaction.reply({ embeds: [embed], components: [row] });
      return;
    }
  },
};
