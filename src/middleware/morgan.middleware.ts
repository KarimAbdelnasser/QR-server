import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

@Injectable()
export class MorganMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    const start = process.hrtime();

    res.on('finish', () => {
      const logLevel = res.statusCode >= 400 ? 'ERROR' : 'INFO';
      const color = logLevel === 'INFO' ? '\x1b[32m' : '\x1b[31m';
      const timestamp = new Date()
        .toISOString()
        .replace('T', ' ')
        .replace('Z', '');

      const durationInMs = this.calculateResponseTime(start);

      const logMessage = `[${logLevel}] ${res.statusCode} ${req.method} ${
        req.originalUrl
      } - IP: ${req.ip} (${durationInMs.toFixed(3)} ms)`;

      console.log(`${timestamp} - ${color}${logMessage}\x1b[0m`);
    });

    next();
  }

  private calculateResponseTime(start: [number, number]): number {
    const NS_PER_SEC = 1e9;
    const NS_TO_MS = 1e6;

    const diff = process.hrtime(start);
    const durationInNs = diff[0] * NS_PER_SEC + diff[1];
    const durationInMs = durationInNs / NS_TO_MS;

    return durationInMs;
  }
}
