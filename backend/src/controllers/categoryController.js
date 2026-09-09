import { Category } from '../models/Category.js';
import { Food } from '../models/Food.js';
import { ApiError } from '../utils/apiError.js';

export async function list(req, res) {
  const q = String(req.query.q || '').trim();
  const filter = q ? { name: { $regex: q, $options: 'i' } } : {};
  if (req.query.status) filter.status = req.query.status;

  const categories = await Category.find(filter).sort({ createdAt: -1 }).lean();
  const ids = categories.map((c) => c._id);
  const counts = await Food.aggregate([
    { $match: { category: { $in: ids } } },
    { $group: { _id: '$category', count: { $sum: 1 } } }
  ]);
  const countMap = new Map(counts.map((x) => [String(x._id), x.count]));
  res.json({ success: true, data: { categories: categories.map((c) => ({ ...c, foodCount: countMap.get(String(c._id)) || 0 })) } });
}

export async function getOne(req, res) {
  const category = await Category.findById(req.params.id);
  if (!category) throw new ApiError(404, 'Category not found');
  res.json({ success: true, data: { category } });
}

export async function create(req, res) {
  try {
    const category = await Category.create(req.body);
    res.status(201).json({ success: true, message: 'Category created', data: { category } });
  } catch (err) {
    if (err?.code === 11000) throw new ApiError(409, 'Category name already exists');
    throw err;
  }
}

export async function update(req, res) {
  try {
    const category = await Category.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!category) throw new ApiError(404, 'Category not found');
    res.json({ success: true, message: 'Category updated', data: { category } });
  } catch (err) {
    if (err?.code === 11000) throw new ApiError(409, 'Category name already exists');
    throw err;
  }
}

export async function remove(req, res) {
  const category = await Category.findById(req.params.id);
  if (!category) throw new ApiError(404, 'Category not found');
  const foodCount = await Food.countDocuments({ category: category._id });
  if (foodCount > 0) throw new ApiError(409, `Cannot delete category with ${foodCount} food item(s). Move or delete the food first.`);
  await category.deleteOne();
  res.json({ success: true, message: 'Category deleted' });
}
