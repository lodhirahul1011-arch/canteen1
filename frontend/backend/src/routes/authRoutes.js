import { Router } from 'express';
import { body } from 'express-validator';
import { asyncHandler } from '../utils/asyncHandler.js';
import { authLimiter } from '../middleware/security.js';
import { validate } from '../middleware/validation.js';
import { requireAuth } from '../middleware/auth.js';
import * as controller from '../controllers/authController.js';

const router = Router();

const email = body('email').isEmail().normalizeEmail();
const password = body('password').isString().isLength({ min: 8, max: 128 });
const name = body('name').isString().trim().isLength({ min: 2, max: 80 });

router.post(
  '/register',
  authLimiter,
  [name, email, password, body('mobile').optional().isString().trim().isLength({ max: 20 })],
  validate,
  asyncHandler(controller.register)
);

router.post(
  '/login',
  authLimiter,
  [email, password],
  validate,
  asyncHandler(controller.login)
);

router.post('/refresh', authLimiter, asyncHandler(controller.refresh));
router.post('/logout', asyncHandler(controller.logout));
router.get('/me', requireAuth, asyncHandler(controller.me));

export default router;
