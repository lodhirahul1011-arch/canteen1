import mongoose from 'mongoose';

const itemSchema = new mongoose.Schema({
  food: { type: mongoose.Schema.Types.ObjectId, ref: 'Food', required: true },
  name: { type: String, required: true, trim: true, maxlength: 120 },
  quantity: { type: Number, required: true, min: 1 },
  unitPrice: { type: Number, required: true, min: 0 },
  total: { type: Number, required: true, min: 0 }
}, { _id: false });

const orderSchema = new mongoose.Schema({
  orderNo: { type: String, required: true, unique: true, index: true },
  member: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  items: { type: [itemSchema], required: true, validate: v => v.length > 0 },
  subtotal: { type: Number, required: true, min: 0 },
  tax: { type: Number, default: 0, min: 0 },
  discount: { type: Number, default: 0, min: 0 },
  total: { type: Number, required: true, min: 0 },
  status: { type: String, enum: ['PENDING','CONFIRMED','PREPARING','READY','COMPLETED','CANCELLED'], default: 'PENDING', index: true },
  paymentStatus: { type: String, enum: ['UNPAID','PENDING','PAID','REFUNDED'], default: 'UNPAID', index: true },
  notes: { type: String, trim: true, maxlength: 500, default: '' },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  completedAt: Date,
  cancelledAt: Date
}, { timestamps: true, versionKey: false });

orderSchema.index({ member: 1, createdAt: -1 });
orderSchema.index({ status: 1, createdAt: -1 });
export const Order = mongoose.model('Order', orderSchema);
