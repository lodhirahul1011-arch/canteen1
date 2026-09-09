import pino from 'pino';
import env from './env.js';

const logger = pino({
  level: env.logLevel,
  redact: {
    paths: [
      'req.headers.authorization',
      'req.headers.cookie',
      'password',
      'refreshToken',
      'token'
    ],
    censor: '[REDACTED]'
  }
});

export default logger;
