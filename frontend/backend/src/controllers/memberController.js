import { User } from '../models/User.js';
import { ApiError } from '../utils/apiError.js';

const safeSelect = 'name email mobile role permissions department profileImage status createdAt updatedAt';

export async function list(req, res) {
  const filter = {};
  const q = String(req.query.q || '').trim();
  if (q) filter.$or = [
    { name: { $regex: q, $options: 'i' } },
    { email: { $regex: q, $options: 'i' } },
    { mobile: { $regex: q, $options: 'i' } }
  ];
  if (req.query.role) filter.role = req.query.role;
  if (req.query.status) filter.status = req.query.status;
  const members = await User.find(filter).select(safeSelect).sort({ createdAt: -1 }).lean();
  res.json({ success: true, data: { members } });
}

export async function getOne(req, res) {
  const member = await User.findById(req.params.id).select(safeSelect).lean();
  if (!member) throw new ApiError(404, 'Member not found');
  res.json({ success: true, data: { member } });
}

export async function update(req, res) {
  const allowed = ['name', 'mobile', 'role', 'permissions', 'department', 'profileImage', 'status'];
  const updates = Object.fromEntries(Object.entries(req.body).filter(([key]) => allowed.includes(key)));
  if (updates.role && !['MASTER_ADMIN', 'ADMIN', 'STAFF', 'MEMBER'].includes(updates.role)) throw new ApiError(400, 'Invalid role');
  if (req.user.role === 'ADMIN' && updates.role && ['MASTER_ADMIN', 'ADMIN'].includes(updates.role)) throw new ApiError(403, 'Admin cannot assign an elevated role');
  if (updates.status && !['ACTIVE', 'INACTIVE', 'SUSPENDED'].includes(updates.status)) throw new ApiError(400, 'Invalid status');

  if (req.params.id === String(req.user._id) && updates.status && updates.status !== 'ACTIVE') {
    throw new ApiError(400, 'You cannot deactivate your own account');
  }

  const member = await User.findByIdAndUpdate(req.params.id, updates, { new: true, runValidators: true }).select(safeSelect);
  if (!member) throw new ApiError(404, 'Member not found');
  res.json({ success: true, message: 'Member updated', data: { member } });
}

export async function remove(req, res) {
  if (req.params.id === String(req.user._id)) throw new ApiError(400, 'You cannot delete your own account');
  const member = await User.findByIdAndDelete(req.params.id);
  if (!member) throw new ApiError(404, 'Member not found');
  res.json({ success: true, message: 'Member deleted' });
}
