import mongoose from 'mongoose';

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
    },
    passwordHash: { type: String, required: true },
    role: {
      type: String,
      enum: ['admin', 'developer', 'member'],
      default: 'member',
    },
    tenantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant' },
  },
  { timestamps: true }
);

export default mongoose.model('User', userSchema);
