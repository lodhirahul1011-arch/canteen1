import { Router } from 'express';
import { body, param } from 'express-validator';
import { asyncHandler } from '../utils/asyncHandler.js';
import { requireAuth, requireRoles } from '../middleware/auth.js';
import { validate } from '../middleware/validation.js';
import * as controller from '../controllers/memberController.js';

const router = Router();
const id = param('id').isMongoId();
router.use(requireAuth, requireRoles('MASTER_ADMIN', 'ADMIN'));
router.get('/', asyncHandler(controller.list));
router.get('/:id', [id], validate, asyncHandler(controller.getOne));
router.put('/:id', [
  id,
  body('name').optional().isString().trim().isLength({ min: 2, max: 80 }),
  body('mobile').optional().isString().trim().isLength({ max: 20 }),
  body('role').optional().isIn(['MASTER_ADMIN', 'ADMIN', 'STAFF', 'MEMBER']),
  body('permissions').optional().isArray(),
  body('department').optional().isString().trim().isLength({ max: 80 }),
  body('profileImage').optional().isString().trim().isLength({ max: 500 }),
  body('status').optional().isIn(['ACTIVE', 'INACTIVE', 'SUSPENDED'])
], validate, asyncHandler(controller.update));
router.delete('/:id', [id], validate, asyncHandler(controller.remove));
export default router;
