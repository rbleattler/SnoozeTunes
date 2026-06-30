import { describe, expect, it, vi } from 'vitest';

import type { AppConfig } from '../src/config/env.js';
import { handleSleepCommand } from '../src/commands/sleepCommand.js';

const baseConfig: AppConfig = {
  DISCORD_TOKEN: 'token',
  DISCORD_CLIENT_ID: 'client',
  DISCORD_GUILD_ID: 'guild-1',
  VOICE_CHANNEL_ID: 'voice-1',
  ALLOWED_ROLE_ID: '',
  MUSIC_LIBRARY_PATH: '/music',
  TIMEZONE: 'America/New_York',
  EMPTY_CHANNEL_TIMEOUT_MINUTES: 10,
  DEFAULT_PRESET: 'ambient',
  SCHEDULE_ENABLED: false,
  AUTO_START_WHEN_OCCUPIED: false,
  SCHEDULE_START: '22:00',
  SCHEDULE_STOP: '07:00'
};

const createInteraction = (subcommand: string, values: { enabled?: boolean } = {}) => {
  return {
    inGuild: () => true,
    guildId: 'guild-1',
    guild: { id: 'guild-1' },
    member: { roles: { cache: { has: () => false } } },
    options: {
      getSubcommand: () => subcommand,
      getBoolean: () => values.enabled ?? false,
      getString: () => null
    },
    reply: vi.fn().mockResolvedValue(undefined)
  };
};

describe('handleSleepCommand', () => {
  it('enables autostart and triggers an immediate occupancy check', async () => {
    const interaction = createInteraction('autostart', { enabled: true });
    const setAutoStart = vi.fn();
    const triggerAutoStart = vi.fn().mockResolvedValue(undefined);

    await handleSleepCommand(
      interaction as never,
      {
        sleepService: {} as never,
        scheduler: {
          get: () => ({ enabled: false, start: '22:00', stop: '07:00', preset: 'ambient' }),
          set: vi.fn()
        },
        autoStart: {
          get: () => ({ enabled: false }),
          set: setAutoStart,
          trigger: triggerAutoStart
        }
      },
      baseConfig
    );

    expect(setAutoStart).toHaveBeenCalledWith({ enabled: true });
    expect(triggerAutoStart).toHaveBeenCalledOnce();
    expect(interaction.reply).toHaveBeenCalledWith('Auto-start is now **enabled**.');
  });

  it('includes autostart state in status output', async () => {
    const interaction = createInteraction('status');

    await handleSleepCommand(
      interaction as never,
      {
        sleepService: {
          getStatus: () => ({
            playing: false,
            preset: 'ambient',
            currentTrack: null,
            channelId: null
          })
        } as never,
        scheduler: {
          get: () => ({ enabled: false, start: '22:00', stop: '07:00', preset: 'ambient' }),
          set: vi.fn()
        },
        autoStart: {
          get: () => ({ enabled: true }),
          set: vi.fn(),
          trigger: vi.fn()
        }
      },
      baseConfig
    );

    expect(interaction.reply).toHaveBeenCalledWith(expect.stringContaining('**Auto-start:** Enabled'));
  });
});
