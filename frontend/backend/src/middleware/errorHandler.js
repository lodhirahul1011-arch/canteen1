import { ApiError } from '../utils/apiError.js';
import logger from '../config/logger.js';

export function notFound(req, res, next) {
  next(new ApiError(404, `Route not found: ${req.method} ${req.originalUrl}`));
}

export function errorHandler(err, req, res, next) {
  const status = err.statusCode || (err.name === 'ValidationError' ? 422 : 500);

  if (err.code === 11000) {
    return res.status(409).json({
      success: false,
      message: 'A record with this unique value already exists'
    });
  }

  logger.error({ err, requestId: req.id }, 'Request failed');

  res.status(status).json({
    success: false,
    message: status >= 500 ? 'Internal server error' : err.message,
    ...(err.details ? { details: err.details } : {}),
    requestId: req.id
  });
}
