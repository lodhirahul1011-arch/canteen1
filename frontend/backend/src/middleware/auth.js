import { User } from '../models/User.js';
import { verifyAccessToken } from '../utils/tokens.js';
import { ApiError } from '../utils/apiError.js';

export async function requireAuth(req, res, next) {
  const header = req.get('authorization');
  if (!header?.startsWith('Bearer ')) {
    return next(new ApiError(401, 'Authentication required'));
  }

  try {
    const payload = verifyAccessToken(header.slice(7));
    const user = await User.findById(payload.sub).select('+password');
    if (!user || user.status !== 'ACTIVE') {
      return next(new ApiError(401, 'User is not active'));
    }
    req.user = user;
    next();
  } catch {
    next(new ApiError(401, 'Invalid or expired access token'));
  }
}

export function requireRoles(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return next(new ApiError(403, 'Insufficient role permissions'));
    }
    next();
  };
}

export function requirePermissions(...permissions) {
  return (req, res, next) => {
    const allowed = permissions.every(
      (permission) =>
        req.user?.role === 'MASTER_ADMIN' ||
        req.user?.permissions?.includes(permission)
    );
    if (!allowed) return next(new ApiError(403, 'Insufficient permissions'));
    next();
  };
}
