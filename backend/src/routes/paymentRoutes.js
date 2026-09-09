import { Router } from 'express';
import { body,param } from 'express-validator';
import { requireAuth,requireRoles } from '../middleware/auth.js';
import { validate } from '../middleware/validation.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import * as c from '../controllers/paymentController.js';

const r=Router(); r.use(requireAuth);
r.get('/',requireRoles('MASTER_ADMIN','ADMIN','STAFF'),asyncHandler(c.list));
r.get('/:id',[param('id').isMongoId()],validate,asyncHandler(c.getOne));
r.post('/',[
  requireRoles('MASTER_ADMIN','ADMIN','STAFF'),
  body('order').isMongoId(),body('amount').isFloat({min:0}),body('method').isIn(['CASH','UPI','CARD','WALLET','ONLINE']),
  body('status').optional().isIn(['PENDING','SUCCESS','FAILED','REFUNDED']),
  body('transactionId').optional().isString().trim().isLength({max:160}),
  body('notes').optional().isString().trim().isLength({max:300})
],validate,asyncHandler(c.create));
r.patch('/:id/status',[param('id').isMongoId(),body('status').isIn(['PENDING','SUCCESS','FAILED','REFUNDED'])],validate,requireRoles('MASTER_ADMIN','ADMIN'),asyncHandler(c.updateStatus));
export default r;
