import * as winston from 'winston';

const logColors: { [key: string]: string } = {
  info: '\x1b[32m',
  error: '\x1b[31m',
};

export const logger = winston.createLogger({
  format: winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.printf(({ level, message, timestamp }) => {
      const logLevel = level.toUpperCase();
      const color = logColors[level] || '';

      return `${timestamp} - ${color}[${logLevel}]${color ? '\x1b[0m' : ''} ${message}`;
    }),
  ),
  transports: [new winston.transports.Console()],
});
