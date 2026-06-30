const formatMeta = (meta?: Record<string, unknown>): string => {
  if (!meta) {
    return '';
  }

  return ` ${JSON.stringify(meta)}`;
};

const log = (level: 'INFO' | 'WARN' | 'ERROR', message: string, meta?: Record<string, unknown>): void => {
  const line = `[${new Date().toISOString()}] [${level}] ${message}${formatMeta(meta)}`;
  if (level === 'ERROR') {
    console.error(line);
    return;
  }

  console.log(line);
};

export const logger = {
  info: (message: string, meta?: Record<string, unknown>): void => log('INFO', message, meta),
  warn: (message: string, meta?: Record<string, unknown>): void => log('WARN', message, meta),
  error: (message: string, meta?: Record<string, unknown>): void => log('ERROR', message, meta)
};
