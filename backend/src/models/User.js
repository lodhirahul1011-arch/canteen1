import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';
import env from '../config/env.js';

const ROLES = ['MASTER_ADMIN', 'ADMIN', 'STAFF', 'MEMBER'];

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, minlength: 2, maxlength: 80 },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true, index: true },
    mobile: { type: String, trim: true, maxlength: 20 },
    password: { type: String, required: true, minlength: 8, select: false },
    role: { type: String, enum: ROLES, default: 'MEMBER', index: true },
    permissions: { type: [String], default: [] },
    department: { type: String, trim: true, maxlength: 80 },
    profileImage: { type: String, trim: true },
    status: { type: String, enum: ['ACTIVE', 'INACTIVE', 'SUSPENDED'], default: 'ACTIVE', index: true },
    refreshTokens: [{
      tokenId: { type: String, required: true },
      tokenHash: { type: String, required: true },
      expiresAt: { type: Date, required: true }
    }]
  },
  { timestamps: true, versionKey: false }
);

userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, env.bcryptRounds);
  next();
});

userSchema.methods.comparePassword = function(password) {
  return bcrypt.compare(password, this.password);
};

userSchema.methods.toSafeJSON = function() {
  const obj = this.toObject();
  delete obj.password;
  delete obj.refreshTokens;
  return obj;
};

export const User = mongoose.model('User', userSchema);
export { ROLES };
