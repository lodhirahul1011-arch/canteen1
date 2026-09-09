import crypto from 'node:crypto';
import jwt from 'jsonwebtoken';
import env from '../config/env.js';

export function signAccessToken(user) {
  return jwt.sign(
    { sub: user._id.toString(), role: user.role, type: 'access' },
    env.jwtAccessSecret,
    { expiresIn: env.jwtAccessExpires, issuer: 'canteen-erp' }
  );
}

export function signRefreshToken(user, tokenId) {
  return jwt.sign(
    { sub: user._id.toString(), tokenId, type: 'refresh' },
    env.jwtRefreshSecret,
    { expiresIn: env.jwtRefreshExpires, issuer: 'canteen-erp' }
  );
}

export function verifyAccessToken(token) {
  return jwt.verify(token, env.jwtAccessSecret, { issuer: 'canteen-erp' });
}

export function verifyRefreshToken(token) {
  return jwt.verify(token, env.jwtRefreshSecret, { issuer: 'canteen-erp' });
}

export function randomTokenId() {
  return crypto.randomUUID();
}

export function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}
