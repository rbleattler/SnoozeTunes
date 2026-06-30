import { spawn } from 'node:child_process';
import path from 'node:path';

import {
  AudioPlayerStatus,
  EndBehaviorType,
  StreamType,
  VoiceConnectionDisconnectReason,
  VoiceConnectionStatus,
  createAudioPlayer,
  createAudioResource,
  entersState,
  getVoiceConnection,
  joinVoiceChannel,
  type AudioPlayer,
  type VoiceConnection
} from '@discordjs/voice';
import {
  ChannelType,
  type Client,
  type Guild,
  type GuildBasedChannel,
  type Snowflake,
  type VoiceBasedChannel
} from 'discord.js';

import type { AppConfig } from '../config/env.js';
import { findCreditsByTrackName, loadCreditsCatalog, type CreditsCatalog, type TrackCredit } from '../audio/attribution.js';
import { chooseRandomTrack, listPresets, loadPresetTracks, type Track } from '../audio/library.js';
import { logger } from '../utils/logger.js';

interface PlaybackState {
  playing: boolean;
  guildId: string | null;
  channelId: string | null;
  preset: string;
  currentTrack: string | null;
  recentTracks: string[];
}

export class SleepService {
  private readonly player: AudioPlayer;
  private connection: VoiceConnection | null = null;
  private configuredGuildId: string | null = null;
  private currentPreset: string;
  private isStopping = false;
  private creditsCatalog: CreditsCatalog = { tracks: [] };
  private currentTrackName: string | null = null;
  private recentlyPlayedTrackNames: string[] = [];
  private emptyChannelTimer: NodeJS.Timeout | null = null;

  public constructor(
    private readonly client: Client,
    private readonly config: AppConfig
  ) {
    this.player = createAudioPlayer();
    this.currentPreset = config.DEFAULT_PRESET;

    this.player.on(AudioPlayerStatus.Idle, () => {
      if (this.isStopping) {
        return;
      }

      void this.playNextTrack();
    });

    this.player.on('error', (error) => {
      logger.warn('Audio player error. Attempting next track.', { message: error.message });
      void this.playNextTrack();
    });
  }

  public async initialize(): Promise<void> {
    this.creditsCatalog = await loadCreditsCatalog(this.config.MUSIC_LIBRARY_PATH);
    logger.info('Loaded credits catalog', { entries: this.creditsCatalog.tracks.length });
  }

  public async start(guild: Guild, channelId: Snowflake, preset?: string): Promise<void> {
    this.configuredGuildId = guild.id;
    this.currentPreset = preset ?? this.currentPreset;

    const channel = guild.channels.cache.get(channelId);
    if (!channel || !this.isVoiceChannel(channel)) {
      throw new Error('Configured voice channel is not available or is not a voice channel.');
    }

    this.isStopping = false;
    this.connection = joinVoiceChannel({
      guildId: guild.id,
      channelId,
      adapterCreator: guild.voiceAdapterCreator,
      selfDeaf: false
    });

    this.connection.on(VoiceConnectionStatus.Disconnected, (_, newState) => {
      const reason = newState.reason;
      if (reason === VoiceConnectionDisconnectReason.WebSocketClose && newState.closeCode === 4014) {
        this.stop();
        return;
      }

      void entersState(this.connection as VoiceConnection, VoiceConnectionStatus.Connecting, 5_000)
        .then(() => logger.info('Reconnected to voice gateway'))
        .catch(async () => {
          logger.warn('Could not reconnect voice connection. Stopping playback.');
          await this.stop();
        });
    });

    this.connection.subscribe(this.player);

    await entersState(this.connection, VoiceConnectionStatus.Ready, 20_000);
    await this.playNextTrack();
    this.refreshEmptyChannelTimer();

    logger.info('Playback started', { guildId: guild.id, channelId, preset: this.currentPreset });
  }

  public async stop(): Promise<void> {
    this.isStopping = true;
    this.player.stop(true);
    this.currentTrackName = null;
    this.cancelEmptyChannelTimer();

    if (this.connection) {
      this.connection.destroy();
      this.connection = null;
    }

    if (this.configuredGuildId) {
      getVoiceConnection(this.configuredGuildId)?.destroy();
    }

    logger.info('Playback stopped');
  }

  public async playNextTrack(): Promise<void> {
    if (!this.connection) {
      return;
    }

    const tracks = await loadPresetTracks(this.config.MUSIC_LIBRARY_PATH, this.currentPreset);
    const selected = chooseRandomTrack(tracks, this.recentlyPlayedTrackNames);

    if (!selected) {
      throw new Error(`No playable files found in preset "${this.currentPreset}".`);
    }

    this.currentTrackName = selected.name;
    this.recentlyPlayedTrackNames = [selected.path, ...this.recentlyPlayedTrackNames].slice(0, 10);

    const ffmpeg = spawn('ffmpeg', ['-v', 'error', '-i', selected.path, '-f', 's16le', '-ar', '48000', '-ac', '2', 'pipe:1']);

    ffmpeg.on('error', (error) => {
      logger.warn('ffmpeg process error, skipping file', { track: selected.path, error: error.message });
      void this.playNextTrack();
    });

    ffmpeg.stderr.on('data', (chunk) => {
      const message = chunk.toString().trim();
      if (message.length > 0) {
        logger.warn('ffmpeg stderr output', { track: selected.path, message });
      }
    });

    ffmpeg.once('close', (code) => {
      if (code && code !== 0) {
        logger.warn('ffmpeg exited with non-zero code', { track: selected.path, code });
      }
    });

    const resource = createAudioResource(ffmpeg.stdout, {
      inputType: StreamType.Raw,
      inlineVolume: true,
      silencePaddingFrames: 5
    });

    resource.playStream.once('error', (error) => {
      logger.warn('Stream resource failed, skipping track', { track: selected.path, error: error.message });
      void this.playNextTrack();
    });

    this.player.play(resource);
  }

  public getPresets = async (): Promise<string[]> => listPresets(this.config.MUSIC_LIBRARY_PATH);

  public getStatus(): PlaybackState {
    return {
      playing: this.player.state.status === AudioPlayerStatus.Playing,
      guildId: this.connection?.joinConfig.guildId ?? null,
      channelId: this.connection?.joinConfig.channelId ?? null,
      preset: this.currentPreset,
      currentTrack: this.currentTrackName,
      recentTracks: [...this.recentlyPlayedTrackNames].map((trackPath) => path.basename(trackPath))
    };
  }

  public getCredits(): TrackCredit[] {
    if (!this.currentTrackName) {
      return [];
    }

    const current = findCreditsByTrackName(this.creditsCatalog, this.currentTrackName);
    if (current.length > 0) {
      return current;
    }

    return this.recentlyPlayedTrackNames
      .map((trackPath) => findCreditsByTrackName(this.creditsCatalog, path.basename(trackPath)))
      .flat();
  }

  public handleVoiceStateUpdate(guildId: string, channelId: string): void {
    if (!this.connection || this.connection.joinConfig.guildId !== guildId || this.connection.joinConfig.channelId !== channelId) {
      return;
    }

    this.refreshEmptyChannelTimer();
  }

  private refreshEmptyChannelTimer(): void {
    if (!this.connection) {
      return;
    }

    const guild = this.client.guilds.cache.get(this.connection.joinConfig.guildId);
    const connectionChannelId = this.connection.joinConfig.channelId;
    const channel = connectionChannelId ? guild?.channels.cache.get(connectionChannelId) : undefined;

    if (!channel || !this.isVoiceChannel(channel)) {
      return;
    }

    const nonBotMemberCount = channel.members.filter((member) => !member.user.bot).size;
    if (nonBotMemberCount > 0) {
      this.cancelEmptyChannelTimer();
      return;
    }

    if (this.emptyChannelTimer) {
      return;
    }

    this.emptyChannelTimer = setTimeout(() => {
      logger.info('Voice channel stayed empty. Stopping playback.', {
        timeoutMinutes: this.config.EMPTY_CHANNEL_TIMEOUT_MINUTES
      });
      void this.stop();
    }, this.config.EMPTY_CHANNEL_TIMEOUT_MINUTES * 60_000);
  }

  private cancelEmptyChannelTimer(): void {
    if (this.emptyChannelTimer) {
      clearTimeout(this.emptyChannelTimer);
      this.emptyChannelTimer = null;
    }
  }

  private isVoiceChannel(channel: GuildBasedChannel): channel is VoiceBasedChannel {
    return channel.type === ChannelType.GuildVoice || channel.type === ChannelType.GuildStageVoice;
  }
}
