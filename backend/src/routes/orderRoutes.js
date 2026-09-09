import { Router } from 'express';
import { body, param } from 'express-validator';
import { requireAuth, requireRoles } from '../middleware/auth.js';
import { validate } from '../middleware/validation.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import * as c from '../controllers/orderController.js';

const r=Router();
r.use(requireAuth);
r.get('/',asyncHandler(c.list));
r.get('/:id',[param('id').isMongoId(),validate],asyncHandler(c.getOne));
r.post('/',[
  body('member').optional().isMongoId(),
  body('items').isArray({min:1}),
  body('items.*.food').isMongoId(),
  body('items.*.quantity').isInt({min:1}),
  body('tax').optional().isFloat({min:0}),
  body('discount').optional().isFloat({min:0}),
  body('notes').optional().isString().trim().isLength({max:500})
],validate,asyncHandler(c.create));
r.patch('/:id/status',[param('id').isMongoId(),body('status').isIn(['PENDING','CONFIRMED','PREPARING','READY','COMPLETED','CANCELLED'])],validate,requireRoles('MASTER_ADMIN','ADMIN','STAFF'),asyncHandler(c.updateStatus));
export default r;
