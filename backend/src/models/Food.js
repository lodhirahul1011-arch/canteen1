import mongoose from 'mongoose';

const foodSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, minlength: 2, maxlength: 120, index: true },
    description: { type: String, trim: true, maxlength: 500, default: '' },
    price: { type: Number, required: true, min: 0, max: 100000 },
    image: { type: String, trim: true, default: '' },
    category: { type: mongoose.Schema.Types.ObjectId, ref: 'Category', required: true, index: true },
    status: { type: String, enum: ['ACTIVE', 'INACTIVE'], default: 'ACTIVE', index: true }
  },
  { timestamps: true, versionKey: false }
);

foodSchema.index({ name: 'text', description: 'text' });
export const Food = mongoose.model('Food', foodSchema);
