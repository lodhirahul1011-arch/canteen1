import 'dotenv/config';

const required = ['MONGO_URI', 'JWT_ACCESS_SECRET', 'JWT_REFRESH_SECRET'];

if (process.env.NODE_ENV === 'production') {
  if (!process.env.CORS_ORIGIN) throw new Error('CORS_ORIGIN must be configured in production');
  if (process.env.CORS_ORIGIN.split(',').some((origin) => origin.trim() === '*')) throw new Error('Wildcard CORS is not allowed in production');
  for (const key of required) {
    if (!process.env[key] || process.env[key].includes('replace-with')) {
      throw new Error(`${key} must be configured in production`);
    }
  }
}

const env = {
  nodeEnv: process.env.NODE_ENV || 'development',
  port: Number(process.env.PORT || 5000),
  mongoUri: process.env.MONGO_URI,
  corsOrigin: process.env.CORS_ORIGIN || (process.env.NODE_ENV === 'production' ? '' : 'http://localhost:5173'),
  jwtAccessSecret: process.env.JWT_ACCESS_SECRET || 'dev-access-secret-change-me',
  jwtRefreshSecret: process.env.JWT_REFRESH_SECRET || 'dev-refresh-secret-change-me',
  jwtAccessExpires: process.env.JWT_ACCESS_EXPIRES || '15m',
  jwtRefreshExpires: process.env.JWT_REFRESH_EXPIRES || '7d',
  cookieSecure: process.env.COOKIE_SECURE === 'true',
  cookieSameSite: process.env.COOKIE_SAME_SITE || 'lax',
  logLevel: process.env.LOG_LEVEL || 'info',
  bcryptRounds: Number(process.env.BCRYPT_ROUNDS || 12)
};

if (!env.mongoUri) {
  throw new Error('MONGO_URI is required');
}

if (env.nodeEnv === 'production' && env.cookieSameSite === 'none' && !env.cookieSecure) {
  throw new Error('COOKIE_SECURE=true is required when COOKIE_SAME_SITE=none');
}

export default env;
