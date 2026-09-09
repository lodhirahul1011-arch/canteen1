import {Router} from 'express';
import {requireAuth} from '../middleware/auth.js';
import {asyncHandler} from '../utils/asyncHandler.js';
import {list} from '../controllers/foodCostController.js';
const r=Router(); r.use(requireAuth); r.get('/',asyncHandler(list)); export default r;
