import { Router } from 'express';
import { requireAuth,requireRoles } from '../middleware/auth.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import * as c from '../controllers/reportController.js';
const r=Router(); r.use(requireAuth,requireRoles('MASTER_ADMIN','ADMIN','STAFF'));
r.get('/dashboard',asyncHandler(c.dashboard)); r.get('/sales',asyncHandler(c.sales)); r.get('/inventory',asyncHandler(c.inventory));r.get('/top-foods',asyncHandler(c.topFoods));
export default r;
