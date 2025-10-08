// models/Invitation.js
import mongoose from 'mongoose';

const invitationSchema = new mongoose.Schema(
  {
    email: { type: String, required: true },
    tenantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Tenant',
      required: true,
    },
    role: { type: String, required: true, default: 'member' },
    tokenIdentifier: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    status: { type: String, enum: ['pending', 'accepted'], default: 'pending' },
    invitedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  },
  { timestamps: true }
);

export default mongoose.model('Invitation', invitationSchema);
