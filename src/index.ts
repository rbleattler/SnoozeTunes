import 'dotenv/config';

import { REST, Routes } from 'discord.js';
import { ChannelType, Client, Events, GatewayIntentBits, type GuildBasedChannel, type VoiceBasedChannel } from 'discord.js';

import { sleepCommand, handleSleepCommand } from './commands/sleepCommand.js';
import { loadConfig } from './config/env.js';
import { SchedulerService, type ScheduleState } from './services/schedulerService.js';
import { SleepService } from './services/sleepService.js';
import { logger } from './utils/logger.js';

const isVoiceChannel = (channel: GuildBasedChannel): channel is VoiceBasedChannel => {
  return channel.type === ChannelType.GuildVoice || channel.type === ChannelType.GuildStageVoice;
};

const main = async (): Promise<void> => {
  const config = loadConfig();

  const client = new Client({
    intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildVoiceStates]
  });

  const sleepService = new SleepService(client, config);
  const scheduler = new SchedulerService();

  let scheduleState: ScheduleState = {
    enabled: config.SCHEDULE_ENABLED,
    start: config.SCHEDULE_START,
    stop: config.SCHEDULE_STOP,
    preset: config.DEFAULT_PRESET
  };
  let autoStartState = {
    enabled: config.AUTO_START_WHEN_OCCUPIED
  };

  let autoStartInFlight = false;

  const maybeAutoStartFromOccupancy = async (guildId: string): Promise<void> => {
    if (!autoStartState.enabled || !config.DISCORD_GUILD_ID || !config.VOICE_CHANNEL_ID) {
      return;
    }

    if (guildId !== config.DISCORD_GUILD_ID || sleepService.isConnected() || autoStartInFlight) {
      return;
    }

    autoStartInFlight = true;

    try {
      const guild = client.guilds.cache.get(guildId) ?? (await client.guilds.fetch(guildId));
      const channel = guild.channels.cache.get(config.VOICE_CHANNEL_ID);
      if (!channel || !isVoiceChannel(channel)) {
        return;
      }

      const hasHumans = channel.members.some((member) => !member.user.bot);
      if (!hasHumans) {
        return;
      }

      await sleepService.start(guild, config.VOICE_CHANNEL_ID, config.DEFAULT_PRESET);
      logger.info('Auto-start triggered by voice channel occupancy', { guildId, channelId: config.VOICE_CHANNEL_ID });
    } catch (error) {
      logger.warn('Auto-start on occupancy failed', { error: String(error) });
    } finally {
      autoStartInFlight = false;
    }
  };

  const applySchedule = (): void => {
    scheduler.applySchedule(
      scheduleState,
      config.TIMEZONE,
      async (preset) => {
        if (!config.DISCORD_GUILD_ID || !config.VOICE_CHANNEL_ID) {
          logger.warn('Skipping scheduled start due to missing DISCORD_GUILD_ID/VOICE_CHANNEL_ID');
          return;
        }

        const guild = await client.guilds.fetch(config.DISCORD_GUILD_ID);
        await sleepService.start(guild, config.VOICE_CHANNEL_ID, preset ?? config.DEFAULT_PRESET);
      },
      async () => {
        await sleepService.stop();
      }
    );
  };

  client.once(Events.ClientReady, async (readyClient) => {
    logger.info(`Logged in as ${readyClient.user.tag}`);
    logger.info('Startup configuration', {
      guild: config.DISCORD_GUILD_ID || 'all',
      voiceChannel: config.VOICE_CHANNEL_ID || 'unset',
      defaultPreset: config.DEFAULT_PRESET,
      scheduleEnabled: config.SCHEDULE_ENABLED,
      autoStartWhenOccupied: autoStartState.enabled,
      timezone: config.TIMEZONE
    });

    const rest = new REST({ version: '10' }).setToken(config.DISCORD_TOKEN);
    if (config.DISCORD_GUILD_ID) {
      await rest.put(Routes.applicationGuildCommands(config.DISCORD_CLIENT_ID, config.DISCORD_GUILD_ID), { body: [sleepCommand] });
      logger.info('Registered guild slash commands', { guildId: config.DISCORD_GUILD_ID });
    } else {
      await rest.put(Routes.applicationCommands(config.DISCORD_CLIENT_ID), { body: [sleepCommand] });
      logger.info('Registered global slash commands');
    }

    await sleepService.initialize();
    applySchedule();

    if (autoStartState.enabled && config.DISCORD_GUILD_ID) {
      await maybeAutoStartFromOccupancy(config.DISCORD_GUILD_ID);
    }
  });

  client.on(Events.InteractionCreate, async (interaction) => {
    if (!interaction.isChatInputCommand() || interaction.commandName !== 'sleep') {
      return;
    }

    try {
      await handleSleepCommand(
        interaction,
        {
          sleepService,
          scheduler: {
            get: () => scheduleState,
            set: (schedule) => {
              scheduleState = schedule;
              applySchedule();
            }
          },
          autoStart: {
            get: () => autoStartState,
            set: (state) => {
              autoStartState = state;
            },
            trigger: async () => {
              if (!config.DISCORD_GUILD_ID) {
                return;
              }

              await maybeAutoStartFromOccupancy(config.DISCORD_GUILD_ID);
            }
          }
        },
        config
      );
    } catch (error) {
      logger.error('Command handling failed', { error: String(error) });
      const message = 'Sorry, something went wrong while processing that command.';
      if (interaction.deferred || interaction.replied) {
        await interaction.followUp({ content: message, ephemeral: true });
      } else {
        await interaction.reply({ content: message, ephemeral: true });
      }
    }
  });

  client.on(Events.VoiceStateUpdate, (_, nextState) => {
    if (!nextState.guild.id || !nextState.channelId) {
      return;
    }

    sleepService.handleVoiceStateUpdate(nextState.guild.id, nextState.channelId);
    void maybeAutoStartFromOccupancy(nextState.guild.id);
  });

  const gracefulShutdown = async (signal: string): Promise<void> => {
    logger.info(`Received ${signal}, shutting down...`);
    scheduler.stop();
    await sleepService.stop();
    client.destroy();
    process.exit(0);
  };

  process.on('SIGINT', () => {
    void gracefulShutdown('SIGINT');
  });
  process.on('SIGTERM', () => {
    void gracefulShutdown('SIGTERM');
  });

  await client.login(config.DISCORD_TOKEN);
};

void main().catch((error: unknown) => {
  logger.error('Fatal startup error', { error: String(error) });
  process.exit(1);
});
