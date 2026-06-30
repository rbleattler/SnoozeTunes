import { SlashCommandBuilder, type ChatInputCommandInteraction, type GuildMember, type RESTPostAPIApplicationCommandsJSONBody } from 'discord.js';

import type { AppConfig } from '../config/env.js';
import { parseTimeOrThrow } from '../config/env.js';
import { type ScheduleState } from '../services/schedulerService.js';
import { type SleepService } from '../services/sleepService.js';

export const sleepCommand: RESTPostAPIApplicationCommandsJSONBody = new SlashCommandBuilder()
  .setName('sleep')
  .setDescription('Control SnoozeTunes playback')
  .addSubcommand((subcommand) =>
    subcommand
      .setName('start')
      .setDescription('Start playback in the configured voice channel')
      .addStringOption((option) => option.setName('preset').setDescription('Preset folder to play').setRequired(false))
  )
  .addSubcommand((subcommand) => subcommand.setName('stop').setDescription('Stop playback and disconnect'))
  .addSubcommand((subcommand) => subcommand.setName('status').setDescription('Show playback status'))
  .addSubcommand((subcommand) => subcommand.setName('presets').setDescription('List available music presets'))
  .addSubcommand((subcommand) =>
    subcommand
      .setName('schedule')
      .setDescription('Configure daily schedule')
      .addStringOption((option) => option.setName('start').setDescription('Start time HH:mm').setRequired(true))
      .addStringOption((option) => option.setName('stop').setDescription('Stop time HH:mm').setRequired(true))
      .addStringOption((option) => option.setName('preset').setDescription('Preset to use when schedule starts').setRequired(false))
  )
  .addSubcommand((subcommand) =>
    subcommand
      .setName('autostart')
      .setDescription('Enable or disable auto-start when the voice channel is occupied')
      .addBooleanOption((option) => option.setName('enabled').setDescription('Whether auto-start should be enabled').setRequired(true))
  )
  .addSubcommand((subcommand) => subcommand.setName('credits').setDescription('Show attribution info for active/recent tracks'))
  .toJSON();

const canUseCommand = (interaction: ChatInputCommandInteraction, config: AppConfig): boolean => {
  if (!interaction.inGuild()) {
    return false;
  }

  if (config.DISCORD_GUILD_ID && interaction.guildId !== config.DISCORD_GUILD_ID) {
    return false;
  }

  if (!config.ALLOWED_ROLE_ID) {
    return true;
  }

  const member = interaction.member as GuildMember;
  return member.roles.cache.has(config.ALLOWED_ROLE_ID);
};

export const handleSleepCommand = async (
  interaction: ChatInputCommandInteraction,
  services: {
    sleepService: SleepService;
    scheduler: {
      get: () => ScheduleState;
      set: (schedule: ScheduleState) => void;
    };
    autoStart: {
      get: () => { enabled: boolean };
      set: (state: { enabled: boolean }) => void;
      trigger: () => Promise<void>;
    };
  },
  config: AppConfig
): Promise<void> => {
  if (!canUseCommand(interaction, config)) {
    await interaction.reply({
      content: 'Sorry, you do not have access to this command here.',
      ephemeral: true
    });
    return;
  }

  const subcommand = interaction.options.getSubcommand();

  if (subcommand === 'start') {
    if (!interaction.guild || !config.VOICE_CHANNEL_ID) {
      await interaction.reply({
        content: 'VOICE_CHANNEL_ID is not configured. Please set it in your environment.',
        ephemeral: true
      });
      return;
    }

    const preset = interaction.options.getString('preset') ?? config.DEFAULT_PRESET;
    await services.sleepService.start(interaction.guild, config.VOICE_CHANNEL_ID, preset);
    await interaction.reply(`Starting playback in <#${config.VOICE_CHANNEL_ID}> with preset **${preset}**.`);
    return;
  }

  if (subcommand === 'stop') {
    await services.sleepService.stop();
    await interaction.reply('Stopped playback and disconnected. Sleep well!');
    return;
  }

  if (subcommand === 'status') {
    const status = services.sleepService.getStatus();
    const schedule = services.scheduler.get();
    const autoStart = services.autoStart.get();
    await interaction.reply(
      `**Playback:** ${status.playing ? 'Playing' : 'Stopped'}\n` +
        `**Preset:** ${status.preset}\n` +
        `**Track:** ${status.currentTrack ?? 'N/A'}\n` +
        `**Channel:** ${status.channelId ? `<#${status.channelId}>` : 'N/A'}\n` +
        `**Schedule:** ${schedule.enabled ? `${schedule.start} → ${schedule.stop}` : 'Disabled'}\n` +
        `**Auto-start:** ${autoStart.enabled ? 'Enabled' : 'Disabled'}`
    );
    return;
  }

  if (subcommand === 'presets') {
    const presets = await services.sleepService.getPresets();
    await interaction.reply(presets.length > 0 ? `Available presets: ${presets.join(', ')}` : 'No preset folders found in your music library.');
    return;
  }

  if (subcommand === 'credits') {
    const credits = services.sleepService.getCredits();
    if (credits.length === 0) {
      await interaction.reply('No attribution metadata found for current/recent tracks.');
      return;
    }

    const lines = credits.slice(0, 5).map((credit) => {
      return `• **${credit.title}** — ${credit.artist} (${credit.license})\n  ${credit.attribution}\n  ${credit.sourceUrl}`;
    });

    await interaction.reply(`Attribution:\n${lines.join('\n')}`);
    return;
  }

  if (subcommand === 'schedule') {
    const start = parseTimeOrThrow(interaction.options.getString('start', true));
    const stop = parseTimeOrThrow(interaction.options.getString('stop', true));
    const preset = interaction.options.getString('preset') ?? config.DEFAULT_PRESET;

    services.scheduler.set({ enabled: true, start, stop, preset });
    await interaction.reply(`Schedule updated: start **${start}**, stop **${stop}**, preset **${preset}**.`);
    return;
  }

  if (subcommand === 'autostart') {
    const enabled = interaction.options.getBoolean('enabled', true);
    if (enabled && (!config.DISCORD_GUILD_ID || !config.VOICE_CHANNEL_ID)) {
      await interaction.reply({
        content: 'DISCORD_GUILD_ID and VOICE_CHANNEL_ID must be configured before enabling auto-start.',
        ephemeral: true
      });
      return;
    }

    services.autoStart.set({ enabled });
    if (enabled) {
      await services.autoStart.trigger();
    }

    await interaction.reply(`Auto-start is now **${enabled ? 'enabled' : 'disabled'}**.`);
  }
};
