// models/Integration.js
import mongoose from 'mongoose';

const integrationSchema = new mongoose.Schema(
  {
    tenantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Tenant',
      required: true,
    },
    type: { type: String, enum: ['mongodb'], required: true },
    connectionUri: { type: String, required: true }, // securely encrypted
    dbName: { type: String, required: true },
    status: { type: String, enum: ['active', 'inactive'], default: 'active' },
  },
  { timestamps: true }
);

export default mongoose.model('Integration', integrationSchema);
