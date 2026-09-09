import { Router } from 'express';
import { body, param } from 'express-validator';
import { asyncHandler } from '../utils/asyncHandler.js';
import { requireAuth, requireRoles } from '../middleware/auth.js';
import { validate } from '../middleware/validation.js';
import * as controller from '../controllers/categoryController.js';

const router = Router();
const id = param('id').isMongoId();
const fields = [
  body('name').isString().trim().isLength({ min: 2, max: 80 }),
  body('description').optional().isString().trim().isLength({ max: 300 }),
  body('image').optional().isString().trim().isLength({ max: 500 }),
  body('status').optional().isIn(['ACTIVE', 'INACTIVE'])
];

router.use(requireAuth);
router.get('/', asyncHandler(controller.list));
router.get('/:id', [id], validate, asyncHandler(controller.getOne));
router.post('/', requireRoles('MASTER_ADMIN', 'ADMIN'), fields, validate, asyncHandler(controller.create));
router.put('/:id', requireRoles('MASTER_ADMIN', 'ADMIN'), [id, ...fields], validate, asyncHandler(controller.update));
router.delete('/:id', requireRoles('MASTER_ADMIN', 'ADMIN'), [id], validate, asyncHandler(controller.remove));
export default router;
