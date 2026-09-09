import { User } from '../models/User.js';
import { ApiError } from '../utils/apiError.js';
import {
  hashToken,
  randomTokenId,
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken
} from '../utils/tokens.js';
import env from '../config/env.js';

function setRefreshCookie(res, token) {
  res.cookie('refreshToken', token, {
    httpOnly: true,
    secure: env.cookieSecure,
    sameSite: env.cookieSameSite,
    maxAge: 7 * 24 * 60 * 60 * 1000,
    path: '/api/v1/auth'
  });
}

function publicUser(user) {
  return user.toSafeJSON();
}

export async function register(req, res) {
  const { name, email, password, mobile } = req.body;

  const exists = await User.exists({ email });
  if (exists) throw new ApiError(409, 'Email already registered');

  const user = await User.create({
    name,
    email,
    password,
    mobile,
    role: 'MEMBER'
  });

  const accessToken = signAccessToken(user);
  const tokenId = randomTokenId();
  const refreshToken = signRefreshToken(user, tokenId);

  user.refreshTokens.push({
    tokenId,
    tokenHash: hashToken(refreshToken),
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
  });
  await user.save({ validateBeforeSave: false });

  setRefreshCookie(res, refreshToken);
  res.status(201).json({
    success: true,
    message: 'Registration successful',
    data: { user: publicUser(user), accessToken }
  });
}

export async function login(req, res) {
  const { email, password } = req.body;

  const user = await User.findOne({ email }).select('+password');
  if (!user || user.status !== 'ACTIVE' || !(await user.comparePassword(password))) {
    throw new ApiError(401, 'Invalid email or password');
  }

  const accessToken = signAccessToken(user);
  const tokenId = randomTokenId();
  const refreshToken = signRefreshToken(user, tokenId);

  user.refreshTokens = user.refreshTokens.filter(
    (item) => item.expiresAt > new Date()
  );
  user.refreshTokens.push({
    tokenId,
    tokenHash: hashToken(refreshToken),
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
  });
  await user.save({ validateBeforeSave: false });

  setRefreshCookie(res, refreshToken);
  res.json({
    success: true,
    message: 'Login successful',
    data: { user: publicUser(user), accessToken }
  });
}

export async function refresh(req, res) {
  const token = req.cookies?.refreshToken;
  if (!token) throw new ApiError(401, 'Refresh token missing');

  let payload;
  try {
    payload = verifyRefreshToken(token);
  } catch {
    throw new ApiError(401, 'Invalid or expired refresh token');
  }

  const user = await User.findById(payload.sub).select('+password');
  if (!user || user.status !== 'ACTIVE') throw new ApiError(401, 'User is not active');

  const stored = user.refreshTokens.find(
    (item) =>
      item.tokenId === payload.tokenId &&
      item.tokenHash === hashToken(token) &&
      item.expiresAt > new Date()
  );

  if (!stored) throw new ApiError(401, 'Refresh token has been revoked');

  // Rotate token: revoke the presented token and issue a new one.
  user.refreshTokens = user.refreshTokens.filter((item) => item.tokenId !== payload.tokenId);

  const tokenId = randomTokenId();
  const refreshToken = signRefreshToken(user, tokenId);
  user.refreshTokens.push({
    tokenId,
    tokenHash: hashToken(refreshToken),
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
  });
  await user.save({ validateBeforeSave: false });

  setRefreshCookie(res, refreshToken);
  res.json({
    success: true,
    message: 'Token refreshed',
    data: { accessToken: signAccessToken(user) }
  });
}

export async function logout(req, res) {
  const token = req.cookies?.refreshToken;
  if (token) {
    try {
      const payload = verifyRefreshToken(token);
      const user = await User.findById(payload.sub);
      if (user) {
        user.refreshTokens = user.refreshTokens.filter(
          (item) => item.tokenId !== payload.tokenId
        );
        await user.save({ validateBeforeSave: false });
      }
    } catch {
      // Logout should remain idempotent.
    }
  }

  res.clearCookie('refreshToken', { httpOnly: true, path: '/api/v1/auth' });
  res.json({ success: true, message: 'Logged out successfully' });
}

export async function me(req, res) {
  res.json({ success: true, data: { user: publicUser(req.user) } });
}
