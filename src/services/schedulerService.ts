import cron, { type ScheduledTask } from 'node-cron';

import { parseTimeOrThrow } from '../config/env.js';
import { logger } from '../utils/logger.js';

export interface ScheduleState {
  enabled: boolean;
  start: string;
  stop: string;
  preset?: string;
}

const toCronExpression = (time: string): string => {
  const [hour, minute] = parseTimeOrThrow(time).split(':');
  return `${minute} ${hour} * * *`;
};

export class SchedulerService {
  private startTask: ScheduledTask | null = null;
  private stopTask: ScheduledTask | null = null;

  public applySchedule(
    schedule: ScheduleState,
    timezone: string,
    onStart: (preset?: string) => Promise<void>,
    onStop: () => Promise<void>
  ): void {
    this.stop();

    if (!schedule.enabled) {
      return;
    }

    this.startTask = cron.schedule(
      toCronExpression(schedule.start),
      () => {
        void onStart(schedule.preset).catch((error: unknown) => {
          logger.error('Scheduled start failed', { error: String(error) });
        });
      },
      { timezone }
    );

    this.stopTask = cron.schedule(
      toCronExpression(schedule.stop),
      () => {
        void onStop().catch((error: unknown) => {
          logger.error('Scheduled stop failed', { error: String(error) });
        });
      },
      { timezone }
    );
  }

  public stop(): void {
    this.startTask?.stop();
    this.stopTask?.stop();
    this.startTask = null;
    this.stopTask = null;
  }
}
