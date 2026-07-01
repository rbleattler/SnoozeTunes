import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { AppConfig } from '../src/config/env.js';
import { SleepService } from '../src/services/sleepService.js';

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

describe('SleepService', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  it('starts the empty-channel timeout when the connected channel becomes empty', async () => {
    const client = {
      user: {
        id: 'bot-1'
      },
      guilds: {
        cache: {
          get: () => ({
            voiceStates: {
              cache: []
            }
          })
        }
      }
    };

    const service = new SleepService(client as never, baseConfig);
    const stopSpy = vi.spyOn(service, 'stop').mockResolvedValue(undefined);

    (service as { connection: { joinConfig: { guildId: string; channelId: string } } }).connection = {
      joinConfig: {
        guildId: 'guild-1',
        channelId: 'voice-1'
      }
    };

    service.handleVoiceStateUpdate('guild-1');
    await vi.advanceTimersByTimeAsync(baseConfig.EMPTY_CHANNEL_TIMEOUT_MINUTES * 60_000);

    expect(stopSpy).toHaveBeenCalledOnce();
  });

  it('cancels the disconnect timer when a human is in the connected channel', async () => {
    const client = {
      user: {
        id: 'bot-1'
      },
      guilds: {
        cache: {
          get: () => ({
            voiceStates: {
              cache: [
                {
                  id: 'user-1',
                  channelId: 'voice-1',
                  member: {
                    user: {
                      bot: false
                    }
                  }
                }
              ]
            }
          })
        }
      }
    };

    const service = new SleepService(client as never, baseConfig);
    const stopSpy = vi.spyOn(service, 'stop').mockResolvedValue(undefined);

    (service as { connection: { joinConfig: { guildId: string; channelId: string } } }).connection = {
      joinConfig: {
        guildId: 'guild-1',
        channelId: 'voice-1'
      }
    };

    service.handleVoiceStateUpdate('guild-1');
    await vi.advanceTimersByTimeAsync(baseConfig.EMPTY_CHANNEL_TIMEOUT_MINUTES * 60_000);

    expect(stopSpy).not.toHaveBeenCalled();
  });
});
