import { Food } from '../models/Food.js';
import { Category } from '../models/Category.js';
import { ApiError } from '../utils/apiError.js';

export async function list(req, res) {
  const filter = {};
  const q = String(req.query.q || '').trim();
  if (q) filter.$or = [{ name: { $regex: q, $options: 'i' } }, { description: { $regex: q, $options: 'i' } }];
  if (req.query.category) filter.category = req.query.category;
  if (req.query.status) filter.status = req.query.status;
  const foods = await Food.find(filter).populate('category', 'name status').sort({ createdAt: -1 }).lean();
  res.json({ success: true, data: { foods } });
}

export async function getOne(req, res) {
  const food = await Food.findById(req.params.id).populate('category', 'name status');
  if (!food) throw new ApiError(404, 'Food not found');
  res.json({ success: true, data: { food } });
}

export async function create(req, res) {
  const category = await Category.findById(req.body.category);
  if (!category) throw new ApiError(400, 'Selected category does not exist');
  const food = await Food.create(req.body);
  await food.populate('category', 'name status');
  res.status(201).json({ success: true, message: 'Food created', data: { food } });
}

export async function update(req, res) {
  if (req.body.category) {
    const category = await Category.findById(req.body.category);
    if (!category) throw new ApiError(400, 'Selected category does not exist');
  }
  const food = await Food.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true }).populate('category', 'name status');
  if (!food) throw new ApiError(404, 'Food not found');
  res.json({ success: true, message: 'Food updated', data: { food } });
}

export async function remove(req, res) {
  const food = await Food.findByIdAndDelete(req.params.id);
  if (!food) throw new ApiError(404, 'Food not found');
  res.json({ success: true, message: 'Food deleted' });
}
