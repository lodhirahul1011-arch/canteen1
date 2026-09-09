import mongoose from 'mongoose';

const categorySchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, minlength: 2, maxlength: 80, unique: true, index: true },
    description: { type: String, trim: true, maxlength: 300, default: '' },
    image: { type: String, trim: true, default: '' },
    status: { type: String, enum: ['ACTIVE', 'INACTIVE'], default: 'ACTIVE', index: true }
  },
  { timestamps: true, versionKey: false }
);

export const Category = mongoose.model('Category', categorySchema);
