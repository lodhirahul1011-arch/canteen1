import mongoose from 'mongoose';

const notificationSchema = new mongoose.Schema({
  recipient: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  title: { type: String, required: true, trim: true, maxlength: 120 },
  message: { type: String, required: true, trim: true, maxlength: 500 },
  type: { type: String, enum: ['ORDER','PAYMENT','INVENTORY','SYSTEM'], default: 'SYSTEM', index: true },
  readAt: Date
}, { timestamps: true, versionKey: false });

notificationSchema.index({ recipient: 1, createdAt: -1 });
export const Notification = mongoose.model('Notification', notificationSchema);
