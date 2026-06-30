import { z } from 'zod';

const hhmmRegex = /^([01]\d|2[0-3]):([0-5]\d)$/;

const envSchema = z.object({
  DISCORD_TOKEN: z.string().min(1, 'DISCORD_TOKEN is required'),
  DISCORD_CLIENT_ID: z.string().min(1, 'DISCORD_CLIENT_ID is required'),
  DISCORD_GUILD_ID: z.string().optional().default(''),
  VOICE_CHANNEL_ID: z.string().optional().default(''),
  ALLOWED_ROLE_ID: z.string().optional().default(''),
  MUSIC_LIBRARY_PATH: z.string().min(1).default('/music'),
  TIMEZONE: z.string().min(1).default('America/New_York'),
  EMPTY_CHANNEL_TIMEOUT_MINUTES: z.coerce.number().int().positive().default(10),
  DEFAULT_PRESET: z.string().min(1).default('ambient'),
  SCHEDULE_ENABLED: z
    .string()
    .optional()
    .default('false')
    .transform((value) => value.toLowerCase() === 'true'),
  SCHEDULE_START: z.string().regex(hhmmRegex).default('22:00'),
  SCHEDULE_STOP: z.string().regex(hhmmRegex).default('07:00')
});

export type AppConfig = z.infer<typeof envSchema>;

export const parseTimeOrThrow = (value: string): string => {
  if (!hhmmRegex.test(value)) {
    throw new Error(`Invalid time value "${value}". Expected HH:mm.`);
  }

  return value;
};

export const loadConfig = (): AppConfig => {
  const parsed = envSchema.safeParse(process.env);
  if (!parsed.success) {
    const issues = parsed.error.issues.map((issue) => `${issue.path.join('.')}: ${issue.message}`).join('; ');
    throw new Error(`Configuration validation failed: ${issues}`);
  }

  return parsed.data;
};
