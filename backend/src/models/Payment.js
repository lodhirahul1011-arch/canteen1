import mongoose from 'mongoose';

const paymentSchema = new mongoose.Schema({
  paymentNo: { type: String, required: true, unique: true, index: true },
  order: { type: mongoose.Schema.Types.ObjectId, ref: 'Order', required: true, unique: true, index: true },
  amount: { type: Number, required: true, min: 0 },
  method: { type: String, enum: ['CASH','UPI','CARD','WALLET','ONLINE'], required: true },
  status: { type: String, enum: ['PENDING','SUCCESS','FAILED','REFUNDED'], default: 'PENDING', index: true },
  transactionId: { type: String, trim: true, maxlength: 160 },
  paidAt: Date,
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  notes: { type: String, trim: true, maxlength: 300 }
}, { timestamps: true, versionKey: false });

export const Payment = mongoose.model('Payment', paymentSchema);
